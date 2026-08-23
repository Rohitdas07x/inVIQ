"""
Unit tests for NotificationService and SMTP Email infrastructure client.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.application.notification_service import NotificationService
from app.infrastructure.email import SmtpEmailClient, smtp_client


def test_send_admin_congratulations_disabled_smtp():
    with patch("app.infrastructure.email.smtp_client.settings") as s:
        s.SMTP_ENABLED = False
        s.SMTP_HOST = "smtp.gmail.com"
        s.SMTP_USER = "test@inviq.io"
        res = NotificationService.send_admin_congratulations_email(
            to_email="bwubts23263@brainwareuniversity.ac.in",
            username="admin",
            full_name="Sayandip Bar",
        )
        assert res is False


def test_send_admin_congratulations_success():
    with (
        patch("app.infrastructure.email.smtp_client.settings") as s,
        patch("smtplib.SMTP") as mock_smtp,
    ):
        s.SMTP_ENABLED = True
        s.SMTP_HOST = "smtp.gmail.com"
        s.SMTP_PORT = 587
        s.SMTP_USER = "test@inviq.io"
        s.SMTP_PASSWORD = "secretpassword"
        s.SMTP_FROM_EMAIL = "noreply@inviq.io"
        s.SMTP_FROM_NAME = "InvIQ"
        s.FRONTEND_URL = "http://localhost:5173"

        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        res = NotificationService.send_admin_congratulations_email(
            to_email="bwubts23263@brainwareuniversity.ac.in",
            username="admin_sayandip",
            full_name="Sayandip Bar",
            organization_name="InvIQ Central",
        )

        assert res is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@inviq.io", "secretpassword")
        mock_server.sendmail.assert_called_once()


def test_send_welcome_email_with_activation_link():
    with (
        patch("app.infrastructure.email.smtp_client.settings") as s,
        patch("smtplib.SMTP") as mock_smtp,
    ):
        s.SMTP_ENABLED = True
        s.SMTP_HOST = "smtp.gmail.com"
        s.SMTP_PORT = 587
        s.SMTP_USER = "test@inviq.io"
        s.SMTP_PASSWORD = "secretpassword"
        s.SMTP_FROM_EMAIL = "noreply@inviq.io"
        s.SMTP_FROM_NAME = "InvIQ"
        s.FRONTEND_URL = "http://localhost:5173"
        s.PROJECT_NAME = "InvIQ"

        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        res = NotificationService.send_welcome_email(
            to_email="staff@example.com",
            username="staff_member",
            role="staff",
            full_name="Staff Member",
            activation_link="http://localhost:5173/reset-password?token=mocktoken123",
        )

        assert res is True
        mock_server.starttls.assert_called_once()
        mock_server.sendmail.assert_called_once()

        # Verify sent email recipient and sender
        call_args = mock_server.sendmail.call_args[0]
        assert call_args[0] == "noreply@inviq.io"
        assert "staff@example.com" in call_args[1]


def test_send_low_stock_alerts_bulk():
    with (
        patch("app.infrastructure.email.smtp_client.settings") as s,
        patch("smtplib.SMTP") as mock_smtp,
    ):
        s.SMTP_ENABLED = True
        s.SMTP_HOST = "smtp.gmail.com"
        s.SMTP_PORT = 587
        s.SMTP_USER = "test@inviq.io"
        s.SMTP_PASSWORD = "secretpassword"
        s.SMTP_FROM_EMAIL = "alerts@inviq.io"
        s.SMTP_FROM_NAME = "InvIQ Alerts"
        s.FRONTEND_URL = "http://localhost:5173"

        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        sent_count = NotificationService.send_low_stock_alert(
            recipients=["admin1@inviq.io", "admin2@inviq.io"],
            item_name="Paracetamol 500mg",
            item_id=1,
            location_id=1,
            current_stock=2,
            min_stock=10,
            alert_status="CRITICAL",
            location_name="Main Pharmacy",
        )

        assert sent_count == 2
        assert mock_server.sendmail.call_count == 2
