"""
Celery configuration and task runner for InvIQ.

Connects to Redis message broker and coordinates periodic background jobs
for retail chemist stores (FEFO expiry audits, stock reorder recommendations, cold-chain checks)
and heavy asynchronous workloads (bulk CSV/Excel imports, invoice PDF generation, email dispatch).
"""

import logging
import ssl
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

logger = logging.getLogger("smart_inventory.celery")


def _get_broker_url() -> str:
    """Resolve Celery broker URL from settings with Upstash TLS compatibility."""
    if settings.REDIS_URL:
        return settings.REDIS_URL
    if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        host = (
            settings.UPSTASH_REDIS_REST_URL
            .replace("https://", "")
            .replace("http://", "")
            .rstrip("/")
        )
        if ":" in host:
            host = host.split(":")[0]
        token = settings.UPSTASH_REDIS_REST_TOKEN
        return f"rediss://default:{token}@{host}:6379/0"
    return "redis://localhost:6379/0"


broker_url = _get_broker_url()
is_ssl = broker_url.startswith("rediss://")

celery_app = Celery(
    "inviq_tasks",
    broker=broker_url,
    backend=broker_url,
    include=["app.workers.tasks"],
)

conf_dict = {
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "Asia/Kolkata",
    "enable_utc": True,
    "task_track_started": True,
    "task_time_limit": 600,         # 10 minutes max per task
    "task_soft_time_limit": 540,    # 9 minutes soft limit
    "worker_prefetch_multiplier": 1,
    "beat_schedule": {
        "fefo-expiry-audit-every-6-hours": {
            "task": "app.workers.tasks.celery_fefo_audit",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        "stock-threshold-audit-hourly": {
            "task": "app.workers.tasks.celery_stock_audit",
            "schedule": crontab(minute=0, hour="*"),
        },
        "cold-chain-monitoring-every-30-mins": {
            "task": "app.workers.tasks.celery_cold_chain_check",
            "schedule": crontab(minute="*/30"),
        },
    },
}

if is_ssl:
    conf_dict["broker_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}
    conf_dict["redis_backend_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app.conf.update(conf_dict)
