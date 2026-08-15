"""
Unit tests for NotificationService (welcome emails, low-stock alerts, admin congratulations).
"""

import pytest
from unittest.mock import patch, MagicMock
from app.application.notification_service import NotificationService


def test_send_admin_congratulations_disabled_smtp():
    with patch("app.application.notification_service.settings") as s:
        s.SMTP_ENABLED = False
        res = NotificationService.send_admin_congratulations_email(
            to_email="bwubts23263@brainwareuniversity.ac.in",
            username="admin",
            full_name="Sayandip Bar",
        )
        assert res is False


def test_send_admin_congratulations_success():
    with (
        patch("app.application.notification_service.settings") as s,
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
