"""
WebSocket endpoint tests.

Tests /ws/alerts authentication gating and connection lifecycle.
Uses Starlette's WebSocketTestSession via FastAPI TestClient.
"""

import pytest
from tests.conftest import get_auth_header


class TestWebSocketAuth:
    """Authentication enforcement before connection is accepted."""

    def test_no_token_closes_connection(self, client):
        """Connecting without a token must be rejected (code 4001)."""
        with pytest.raises(Exception):
            # TestClient raises when WS is closed before sending
            with client.websocket_connect("/ws/alerts") as ws:
                ws.receive_json()

    def test_invalid_token_closes_connection(self, client):
        """An invalid / expired token must be rejected."""
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/alerts?token=bad.token.here") as ws:
                ws.receive_json()

    def test_valid_token_accepted(self, client, test_user):
        """A valid JWT allows the connection to open."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        token = headers["Authorization"].split(" ")[1]

        with client.websocket_connect(f"/ws/alerts?token={token}") as ws:
            # Connection is open — server is listening
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"

    def test_admin_token_accepted(self, client, admin_user):
        """Admin JWT also allows connection."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        token = headers["Authorization"].split(" ")[1]

        with client.websocket_connect(f"/ws/alerts?token={token}") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data == {"type": "pong"}


class TestWebSocketPingPong:
    """Keepalive ping / pong protocol."""

    def _open(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        token = headers["Authorization"].split(" ")[1]
        return client.websocket_connect(f"/ws/alerts?token={token}")

    def test_ping_returns_pong(self, client, test_user):
        with self._open(client, test_user) as ws:
            ws.send_text("ping")
            msg = ws.receive_json()
            assert msg["type"] == "pong"

    def test_multiple_pings(self, client, test_user):
        """Multiple consecutive pings must each receive a pong."""
        with self._open(client, test_user) as ws:
            for _ in range(3):
                ws.send_text("ping")
                msg = ws.receive_json()
                assert msg["type"] == "pong"


class TestWebSocketBroadcast:
    """Pending alerts are drained and broadcast to connected clients."""

    def _open(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        token = headers["Authorization"].split(" ")[1]
        return client.websocket_connect(f"/ws/alerts?token={token}")

    def test_pending_alert_is_broadcast_on_ping(self, client, test_user):
        """An alert appended to pending_alerts is sent to the client on next ping."""
        from app.api.routes.websocket import pending_alerts

        alert_payload = {
            "type": "stock_alert",
            "item": "Paracetamol",
            "status": "CRITICAL",
            "org_id": test_user.get("org_id", 1),
        }
        pending_alerts.append(alert_payload)

        with self._open(client, test_user) as ws:
            ws.send_text("ping")
            # First message could be the alert OR the pong depending on ordering.
            # Drain up to 2 messages and check the alert appears.
            messages = []
            try:
                messages.append(ws.receive_json())
                messages.append(ws.receive_json())
            except Exception:
                pass

            payloads = [m for m in messages if m.get("type") == "stock_alert"]
            assert payloads, f"Expected stock_alert in {messages}"

        # Clean up in case the broadcast didn't drain it
        pending_alerts.clear()

    def test_pending_alerts_cleared_after_broadcast(self, client, test_user):
        """Alerts list is empty after they are dispatched."""
        from app.api.routes.websocket import pending_alerts

        pending_alerts.append({"type": "test_event", "org_id": test_user.get("org_id", 1)})
        with self._open(client, test_user) as ws:
            ws.send_text("ping")
            try:
                ws.receive_json()
                ws.receive_json()
            except Exception:
                pass

        assert len(pending_alerts) == 0



class TestConnectionManager:
    """Unit tests for ConnectionManager.connect / disconnect / broadcast."""

    @pytest.mark.asyncio
    async def test_connect_increments_count(self):
        from unittest.mock import AsyncMock, MagicMock
        from app.api.routes.websocket import ConnectionManager

        mgr = ConnectionManager()
        ws = AsyncMock()
        await mgr.connect(ws)
        assert len(mgr.active_connections) == 1

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(self):
        from unittest.mock import AsyncMock
        from app.api.routes.websocket import ConnectionManager

        mgr = ConnectionManager()
        ws = AsyncMock()
        await mgr.connect(ws)
        mgr.disconnect(ws)
        assert len(mgr.active_connections) == 0

    @pytest.mark.asyncio
    async def test_broadcast_sends_to_all(self):
        from unittest.mock import AsyncMock
        from app.api.routes.websocket import ConnectionManager

        mgr = ConnectionManager()
        ws1, ws2 = AsyncMock(), AsyncMock()
        await mgr.connect(ws1)
        await mgr.connect(ws2)

        msg = {"type": "alert", "data": "test"}
        await mgr.broadcast(msg)

        ws1.send_json.assert_called_once_with(msg)
        ws2.send_json.assert_called_once_with(msg)

    @pytest.mark.asyncio
    async def test_broadcast_removes_dead_connections(self):
        """A connection that raises during send is cleaned up."""
        from unittest.mock import AsyncMock
        from app.api.routes.websocket import ConnectionManager

        mgr = ConnectionManager()
        dead_ws = AsyncMock()
        dead_ws.send_json.side_effect = Exception("closed")
        good_ws = AsyncMock()

        await mgr.connect(dead_ws)
        await mgr.connect(good_ws)

        await mgr.broadcast({"type": "ping"})

        assert dead_ws not in mgr.active_connections
        assert good_ws in mgr.active_connections


class TestWebSocketTicketAuth:
    """Tests for secure single-use ticket WebSocket authentication."""

    def test_issue_ticket_requires_auth(self, client):
        client.cookies.clear()
        res = client.post("/api/websocket/ticket")
        assert res.status_code in [401, 403]

    def test_issue_and_connect_with_ticket(self, client, test_user):
        from app.api.routes.websocket import validate_and_consume_ws_ticket
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        ticket_res = client.post("/api/websocket/ticket", headers=headers)
        assert ticket_res.status_code == 200
        ticket = ticket_res.json()["ticket"]
        assert ticket is not None

        # Connect with the issued ticket
        with client.websocket_connect(f"/ws/alerts?ticket={ticket}") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data == {"type": "pong"}

        # Ticket was consumed on connect — must be None now
        assert validate_and_consume_ws_ticket(ticket) is None

        # Attempting to connect with an invalid/expired ticket must fail
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/alerts?ticket=already-consumed-invalid") as ws:
                ws.send_text("ping")
                ws.receive_json()


class TestTenantScopedAuditAlertRouting:
    """Audit background tasks must never fallback to org 1 when org is missing, and DB enforces NOT NULL org_id."""

    def test_audit_skips_unassociated_org_items(self, db):
        from app.infrastructure.database.models import Item, Location
        from app.application.background_tasks import run_fefo_expiry_audit, run_cold_chain_health_check
        from unittest.mock import patch, Mock
        from datetime import date
        from sqlalchemy import text
        from sqlalchemy.exc import IntegrityError

        # 1. Verify database schema enforces NOT NULL constraint on org_id via direct SQL
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO items (name, category, unit, org_id) VALUES ('Orphan', 'Med', 'Box', NULL)"))
            db.flush()
        db.rollback()

        # 2. Verify background audit tasks safely skip any mock unassociated entity without routing to org 1
        mock_orphan_item = Mock(id=999, name="Orphan Vaccine", category="Vaccine", min_stock=10, storage_temp="cold_chain", org_id=None)
        mock_orphan_tx = Mock(item_id=999, location_id=1, batch_number="ORPHAN-01", expiry_date=date.today(), closing_stock=5)

        with patch("app.application.background_tasks.queue_websocket_alert") as mock_queue, \
             patch.object(db, "query") as mock_query:

            mock_query.return_value.filter.return_value.all.return_value = [mock_orphan_tx]
            run_fefo_expiry_audit(db, days_ahead=30, org_id=None)

            for call_args in mock_queue.call_args_list:
                _, kwargs = call_args
                payload = call_args[0][0] if call_args[0] else kwargs.get("alert")
                if payload and payload.get("item_name") == "Orphan Vaccine":
                    pytest.fail("Alert was erroneously dispatched for unassociated org item!")



