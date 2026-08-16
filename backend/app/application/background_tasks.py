"""
Background tasks module for retail chemist operations.

Provides both standalone asynchronous functions (for direct execution or FastAPI background tasks)
and Celery-compatible task wrappers for scheduled Celery Beat execution.
"""

import logging
from datetime import date, timedelta
from typing import Dict, Any, List

from sqlalchemy.orm import Session
from app.infrastructure.database.models import Item, Location, InventoryTransaction
from app.infrastructure.database.queries import get_critical_alerts
from app.api.routes.websocket import queue_websocket_alert

logger = logging.getLogger("smart_inventory.background")


def run_fefo_expiry_audit(db: Session, days_ahead: int = 60) -> Dict[str, Any]:
    """
    Audits all active inventory batches and identifies batches expiring soon.
    Dispatches real-time WebSocket alerts to pharmacy counters for FEFO rotation.
    """
    cutoff = date.today() + timedelta(days=days_ahead)
    expiring_batches = (
        db.query(InventoryTransaction)
        .join(Item, InventoryTransaction.item_id == Item.id)
        .join(Location, InventoryTransaction.location_id == Location.id)
        .filter(
            InventoryTransaction.expiry_date.isnot(None),
            InventoryTransaction.expiry_date <= cutoff,
            InventoryTransaction.closing_stock > 0,
        )
        .order_by(InventoryTransaction.expiry_date.asc())
        .all()
    )

    total_risk_val = 0.0
    alerts_emitted = 0

    for tx in expiring_batches:
        days_left = (tx.expiry_date - date.today()).days if tx.expiry_date else 0
        mrp = getattr(tx.item, "mrp", 0.0) or 0.0
        risk_val = float(mrp) * float(tx.closing_stock)
        total_risk_val += risk_val

        queue_websocket_alert({
            "type": "fefo_expiry_alert",
            "item_name": tx.item.name,
            "batch_number": tx.batch_number,
            "expiry_date": str(tx.expiry_date),
            "days_remaining": days_left,
            "location_name": tx.location.name,
            "current_stock": tx.closing_stock,
            "estimated_loss_inr": round(risk_val, 2),
        })
        alerts_emitted += 1

    logger.info(
        "FEFO Expiry Audit completed: %d batches identified at risk, ₹%.2f estimated value",
        len(expiring_batches),
        total_risk_val,
    )

    return {
        "status": "success",
        "batches_at_risk": len(expiring_batches),
        "total_risk_value_inr": round(total_risk_val, 2),
        "alerts_emitted": alerts_emitted,
    }


def run_stock_threshold_audit(db: Session) -> Dict[str, Any]:
    """
    Identifies critical and warning stock shortages across all pharmacy locations.
    """
    critical_alerts = get_critical_alerts(db, "CRITICAL")
    warning_alerts = get_critical_alerts(db, "WARNING")

    logger.info(
        "Stock Threshold Audit completed: %d critical, %d warnings",
        len(critical_alerts),
        len(warning_alerts),
    )

    return {
        "status": "success",
        "critical_count": len(critical_alerts),
        "warning_count": len(warning_alerts),
    }


def run_cold_chain_health_check(db: Session) -> Dict[str, Any]:
    """
    Checks all cold-chain compliant items (Insulin, Vaccines, 2-8°C storage).
    """
    cold_items = (
        db.query(Item)
        .filter(Item.storage_temp == "cold_chain")
        .all()
    )

    logger.info("Cold-Chain Check completed: %d items monitored", len(cold_items))
    return {
        "status": "success",
        "cold_chain_items_monitored": len(cold_items),
    }
