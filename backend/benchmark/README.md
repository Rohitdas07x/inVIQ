# 🏎️ InvIQ Benchmark & Performance Profiling Suite

This directory contains dedicated performance benchmarking, latency profiling, and load testing tools for InvIQ.

---

## 📁 Directory Structure

- **`run_latency_benchmark.py`**: Executes real local/cloud latency profiling across:
  1. **5 Core API Endpoints** under concurrent load (p50, p95, p99 percentiles).
  2. **AI RAG Pipeline**: Vector retrieval + LLM inference round-trip timing.
  3. **WebSocket Push Latency**: Server-to-client alert delivery delta timing.
  4. **Database Query Profiler**: Real SQLAlchemy query execution profiling.
- **`locustfile.py`**: Distributed load testing suite with Locust simulating concurrent pharmacy users.
- **`benchmark_results.json`**: Historical and latest benchmark metrics and percentile outputs.

---

## 🚀 How to Run

### 1. Run Real Latency & Profiling Benchmark:
```bash
source venv/bin/activate
python backend/benchmark/run_latency_benchmark.py
```
*Results will automatically update in `backend/benchmark/benchmark_results.json`.*

### 2. Run Locust Load Testing:
```bash
source venv/bin/activate
locust -f backend/benchmark/locustfile.py --host=http://localhost:8000
```
Open [http://localhost:8089](http://localhost:8089) in your browser to start generating load.
