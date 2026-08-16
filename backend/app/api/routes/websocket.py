"""
WebSocket route for real-time critical stock alerts.

Layer: API
Clients connect to /ws/alerts?token=<jwt> to receive push notifications.
Authentication is enforced via JWT token in query parameter before connection
is accepted, preventing unauthenticated access to sensitive stock alerts.

Pub/Sub design:
  - inventory_service.py (sync) calls queue_websocket_alert(alert)
  - If Redis is available: publishes to channel "inviq:ws:alerts"
  - WebSocket handler (async) subscribes to the channel and broadcasts
  - If Redis is unavailable: falls back to in-process list (single-worker only)
"""

import asyncio
import json
import logging
import threading
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

from app.core.security import verify_access_token
from app.core.exceptions import AuthenticationError

logger = logging.getLogger("smart_inventory.websocket")

router = APIRouter(tags=["WebSocket"])

# ── Redis pub/sub channel name ────────────────────────────────────────────────
_ALERT_CHANNEL = "inviq:ws:alerts"


class ConnectionManager:
    """Manages active WebSocket connections for broadcasting alerts."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected (%d total)", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("WebSocket client disconnected (%d remaining)", len(self.active_connections))

    async def broadcast(self, message: dict):
        """Send a message to all connected clients, cleaning up dead connections."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


# Singleton manager
manager = ConnectionManager()

# ── In-process fallback queue (single-worker / no-Redis only) ─────────────────
_alerts_lock = threading.Lock()
_pending_alerts: list = []
pending_alerts = _pending_alerts  # Backwards compatibility alias



def queue_websocket_alert(alert: dict) -> None:
    """
    Queue a real-time alert for delivery to all connected WebSocket clients.

    Routing priority:
      1. In-process queue → immediate local socket consumption (<1ms)
      2. Redis Pub/Sub   → cross-process, production-safe, multi-worker
    """
    import time
    if "_published_at_ms" not in alert:
        alert["_published_at_ms"] = round(time.time() * 1000, 2)

    with _alerts_lock:
        _pending_alerts.append(alert)

    try:
        from app.infrastructure.cache.redis_client import get_redis
        r = get_redis()
        if r:
            r.publish(_ALERT_CHANNEL, json.dumps(alert, default=str))
    except Exception as exc:
        logger.debug("Redis publish failed: %s", exc)




async def start_redis_subscriber():
    """
    Long-running async task: subscribe to Redis pub/sub channel and
    broadcast messages to all connected WebSocket clients.

    Call this from the FastAPI lifespan so it runs for the server lifetime.
    Gracefully exits (with a warning) when Redis is not configured.
    """
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings

        url = settings.REDIS_URL
        if not url and settings.UPSTASH_REDIS_REST_URL:
            # Convert Upstash HTTPS REST URL → rediss:// for asyncio client
            url = (
                settings.UPSTASH_REDIS_REST_URL
                .replace("https://", "rediss://")
                .replace("http://", "redis://")
            )

        if not url:
            logger.info("Redis not configured — WebSocket alerts use in-process queue (single-worker only)")
            return

        client = aioredis.from_url(url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe(_ALERT_CHANNEL)
        logger.info("WebSocket Redis subscriber ready → channel: %s", _ALERT_CHANNEL)

        async for message in pubsub.listen():
            if message and message.get("type") == "message":
                try:
                    alert = json.loads(message["data"])
                    await manager.broadcast(alert)
                except Exception as exc:
                    logger.warning("Failed to broadcast Redis alert: %s", exc)

    except ImportError:
        logger.warning("redis[asyncio] not installed — WebSocket using in-process queue fallback")
    except Exception as exc:
        logger.warning("Redis subscriber error — WebSocket using in-process queue fallback: %s", exc)


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time stock alerts.

    Requires JWT in query param: /ws/alerts?token=<access_token>
    Rejects unauthenticated or invalid token connections before accepting.
    """
    # ── Validate token BEFORE accepting the connection ──────────────────
    token = websocket.query_params.get("token")
    if not token:
        logger.warning("WebSocket rejected: no token from %s", websocket.client)
        await websocket.close(code=4001, reason="Authentication token required")
        return

    try:
        payload = verify_access_token(token)
        username = payload.get("username", "unknown")
    except AuthenticationError:
        logger.warning("WebSocket rejected: invalid token from %s", websocket.client)
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(websocket)
    logger.info("WebSocket user '%s' connected", username)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})

            # Drain in-process fallback queue (no-op when Redis is active)
            with _alerts_lock:
                alerts_to_send = list(_pending_alerts)
                _pending_alerts.clear()

            for alert in alerts_to_send:
                await manager.broadcast(alert)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket user '%s' disconnected", username)
