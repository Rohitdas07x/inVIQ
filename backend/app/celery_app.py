"""
Celery configuration and task runner for InvIQ.

Connects to Redis message broker and coordinates periodic background jobs
for retail chemist stores (FEFO expiry audits, stock reorder recommendations, cold-chain checks).
"""

import logging
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.infrastructure.database.connection import get_db_context
from app.application.background_tasks import (
    run_fefo_expiry_audit,
    run_stock_threshold_audit,
    run_cold_chain_health_check,
)

logger = logging.getLogger("smart_inventory.celery")

celery_app = Celery(
    "inviq_tasks",
    broker=settings.REDIS_URL or "redis://localhost:6379/0",
    backend=settings.REDIS_URL or "redis://localhost:6379/0",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "fefo-expiry-audit-every-6-hours": {
            "task": "app.celery_app.celery_fefo_audit",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        "stock-threshold-audit-hourly": {
            "task": "app.celery_app.celery_stock_audit",
            "schedule": crontab(minute=0, hour="*"),
        },
        "cold-chain-monitoring-every-30-mins": {
            "task": "app.celery_app.celery_cold_chain_check",
            "schedule": crontab(minute="*/30"),
        },
    },
)


@celery_app.task(name="app.celery_app.celery_fefo_audit")
def celery_fefo_audit():
    with get_db_context() as db:
        return run_fefo_expiry_audit(db)


@celery_app.task(name="app.celery_app.celery_stock_audit")
def celery_stock_audit():
    with get_db_context() as db:
        return run_stock_threshold_audit(db)


@celery_app.task(name="app.celery_app.celery_cold_chain_check")
def celery_cold_chain_check():
    with get_db_context() as db:
        return run_cold_chain_health_check(db)
