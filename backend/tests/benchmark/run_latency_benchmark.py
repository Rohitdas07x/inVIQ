"""
InvIQ Real Latency Measurement & Performance Profiler.

Executes real benchmarks locally without synthetic estimation:
1. Synthetic Load Test: Critical inventory & analytics endpoints under concurrent load (p50, p95, p99)
2. AI RAG Pipeline: Vector retrieval + LLM inference round-trip timing
3. WebSocket Push: Server-to-client alert delivery delta timing
4. Database Profiler: SQLAlchemy before/after_cursor_execute query timing
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parents[2]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.infrastructure.database.connection import (
    SessionLocal,
    get_query_metrics,
    clear_query_metrics,
)
from app.infrastructure.database.models import User, Item, Location, InventoryTransaction
from app.api.routes.chat import _build_agent_response
from app.api.routes.websocket import queue_websocket_alert

client = TestClient(app)


def get_valid_admin_tokens(count=50) -> List[str]:
    with SessionLocal() as db:
        users = db.query(User).filter(User.is_active == True).all()
        if not users:
            raise ValueError("No active users in DB")
        tokens = []
        for i in range(count):
            u = users[i % len(users)]
            tokens.append(
                create_access_token(
                    {
                        "sub": str(u.id),
                        "username": u.username,
                        "role": u.role,
                        "org_id": u.org_id or 1,
                    }
                )
            )
        return tokens


def run_load_test(num_users=30, duration_seconds=30) -> Dict[str, List[float]]:
    print(f"\n[1/4] Running Synthetic Load Test ({num_users} virtual users for {duration_seconds}s)...")
    clear_query_metrics()

    user_tokens = get_valid_admin_tokens(num_users)

    # Fetch a valid item barcode for scan-dispense testing
    with SessionLocal() as db:
        item = db.query(Item).first()
        loc = db.query(Location).first()
        barcode = item.barcode if item and item.barcode else "8901234567890"
        loc_id = loc.id if loc else 1

    endpoints: List[Tuple[str, str, Any]] = [
        ("GET", "/api/inventory/items", None),
        ("GET", "/api/analytics/dashboard/stats", None),
        ("GET", "/api/analytics/alerts?severity=CRITICAL", None),
        ("GET", "/api/inventory/locations", None),
        ("POST", "/api/inventory/scan-dispense", {
            "barcode": barcode,
            "location_id": loc_id,
            "quantity": 1,
            "dispensed_by": "bench_bot"
        }),
        ("GET", "/api/admin/overview", None),
    ]

    # Pre-warm L1/L2 cache
    warm_headers = {"Authorization": f"Bearer {user_tokens[0]}"}
    warm_client = TestClient(app)
    for m, p, pl in endpoints:
        try:
            if m == "GET":
                warm_client.get(p, headers=warm_headers)
            else:
                warm_client.post(p, json=pl, headers=warm_headers)
        except Exception:
            pass

    results: Dict[str, List[float]] = {ep[1]: [] for ep in endpoints}
    stop_time = time.time() + duration_seconds
    request_count = 0
    success_count = 0

    def worker_loop(user_idx: int):
        nonlocal request_count, success_count
        token = user_tokens[user_idx % len(user_tokens)]
        headers = {"Authorization": f"Bearer {token}"}
        local_client = TestClient(app)

        while time.time() < stop_time:
            for method, path, payload in endpoints:
                if time.time() >= stop_time:
                    break
                t0 = time.perf_counter()
                try:
                    if method == "GET":
                        resp = local_client.get(path, headers=headers)
                    else:
                        resp = local_client.post(path, json=payload, headers=headers)
                    dur = (time.perf_counter() - t0) * 1000
                    results[path].append(dur)
                    request_count += 1
                    if resp.status_code == 200:
                        success_count += 1
                except Exception:
                    pass

    with ThreadPoolExecutor(max_workers=num_users) as executor:
        futures = [executor.submit(worker_loop, i) for i in range(num_users)]
        for f in futures:
            f.result()

    print(f"  Completed {request_count} total requests ({success_count} successful 200 OK) across {len(endpoints)} endpoints.")
    return results


def run_ai_rag_benchmark(num_queries=5) -> Dict[str, List[float]]:
    print("\n[2/4] Measuring AI Assistant RAG Pipeline Timing (Vector Retrieval + LLM Inference)...")
    with SessionLocal() as db:
        test_questions = [
            "Which medicines have critically low stock in the store?",
            "What is our stock consumption trend for paracetamol?",
            "Give me reorder suggestions for upcoming expiry batches.",
            "Show current stock health across all counter locations.",
            "What antibiotics are stored under cold chain refrigeration?",
        ][:num_queries]

        vector_latencies = []
        llm_latencies = []
        total_rag_latencies = []

        for q in test_questions:
            res = _build_agent_response(q, db)
            timings = res.get("timings", {})
            v_ms = timings.get("vector_retrieval_ms", 0.0)
            l_ms = timings.get("llm_inference_ms", 0.0)
            t_ms = timings.get("total_rag_ms", 0.0)

            vector_latencies.append(v_ms)
            llm_latencies.append(l_ms)
            total_rag_latencies.append(t_ms)
            print(f"  Query: '{q[:40]}...' -> Vector: {v_ms:.2f}ms | LLM: {l_ms:.2f}ms | Total RAG: {t_ms:.2f}ms")
            time.sleep(0.3)

    return {
        "vector_retrieval": vector_latencies,
        "llm_inference": llm_latencies,
        "total_rag": total_rag_latencies,
    }


def run_websocket_latency_benchmark(num_alerts=25) -> List[float]:
    print(f"\n[3/4] Measuring WebSocket Push Latency ({num_alerts} alerts)...")
    from app.api.routes.websocket import _alerts_lock, _pending_alerts
    with _alerts_lock:
        _pending_alerts.clear()

    token = get_valid_admin_tokens(1)[0]
    deltas = []

    with client.websocket_connect(f"/ws/alerts?token={token}") as ws:
        for i in range(num_alerts):
            send_time = time.time() * 1000
            test_alert = {
                "type": "stock_alert",
                "item_name": "Paracetamol 500mg",
                "severity": "CRITICAL",
                "message": f"Critical low stock notification {i}",
                "_published_at_ms": send_time,
            }
            queue_websocket_alert(test_alert)
            ws.send_text("ping")
            data = ws.receive_json()
            recv_time = time.time() * 1000
            if isinstance(data, dict) and "_published_at_ms" in data:
                delta = recv_time - data["_published_at_ms"]
                if 0 <= delta < 5000:
                    deltas.append(delta)
                else:
                    deltas.append(max(0.1, recv_time - send_time))
            else:
                delta = recv_time - send_time
                deltas.append(max(0.1, delta))

    print(f"  Collected {len(deltas)} WebSocket delivery samples.")
    return deltas


def analyze_db_queries() -> Tuple[List[float], List[Dict[str, Any]]]:
    print("\n[4/4] Analyzing Database Query Timing (SQLAlchemy Hooks)...")
    history = get_query_metrics()
    if not history:
        with SessionLocal() as db:
            db.query(Item).all()
            db.query(Location).all()
            db.query(User).all()
        history = get_query_metrics()

    all_durations = [q["duration_ms"] for q in history]

    from collections import defaultdict
    grouped = defaultdict(list)
    for q in history:
        stmt = q["statement"]
        sig = " ".join(stmt.split()[:8]) + "..."
        grouped[sig].append(q["duration_ms"])

    slowest_queries = []
    for sig, durs in grouped.items():
        slowest_queries.append({
            "statement": sig,
            "count": len(durs),
            "avg_ms": round(float(np.mean(durs)), 2),
            "p50_ms": round(float(np.percentile(durs, 50)), 2),
            "p95_ms": round(float(np.percentile(durs, 95)), 2),
            "p99_ms": round(float(np.percentile(durs, 99)), 2),
            "max_ms": round(float(np.max(durs)), 2),
        })

    slowest_queries.sort(key=lambda x: x["avg_ms"], reverse=True)
    return all_durations, slowest_queries[:10]


def compute_percentiles(arr: List[float]) -> Dict[str, Any]:
    if not arr:
        return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "avg": 0.0, "min": 0.0, "max": 0.0, "count": 0}
    return {
        "p50": round(float(np.percentile(arr, 50)), 2),
        "p95": round(float(np.percentile(arr, 95)), 2),
        "p99": round(float(np.percentile(arr, 99)), 2),
        "avg": round(float(np.mean(arr)), 2),
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
        "count": len(arr),
    }


if __name__ == "__main__":
    print("=" * 70)
    print(" InvIQ Real Latency Measurement & Performance Profiling")
    print("=" * 70)

    # 1. Load test on critical endpoints (30 users for 30 seconds)
    api_results = run_load_test(num_users=30, duration_seconds=30)

    # 2. AI RAG Pipeline
    ai_results = run_ai_rag_benchmark(num_queries=5)

    # 3. WebSocket
    ws_results = run_websocket_latency_benchmark(num_alerts=25)

    # 4. DB queries
    db_all, top_10_slowest = analyze_db_queries()

    # Output formatted report
    output_data = {
        "api": {path: compute_percentiles(durs) for path, durs in api_results.items()},
        "ai": {stage: compute_percentiles(durs) for stage, durs in ai_results.items()},
        "websocket": compute_percentiles(ws_results),
        "database": {
            "all_queries": compute_percentiles(db_all),
            "top_slowest": top_10_slowest,
        }
    }

    report_path = Path(__file__).resolve().parent / "benchmark_results.json"
    with open(report_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print("\n" + "=" * 70)
    print(" BENCHMARK COMPLETED — SUMMARY OF MEASUREMENTS:")
    print("=" * 70)
    print(json.dumps(output_data, indent=2))
