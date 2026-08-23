"""
Email infrastructure package for SMTP transport and email delivery.
"""

from app.infrastructure.email.smtp_client import SmtpEmailClient, smtp_client

__all__ = ["SmtpEmailClient", "smtp_client"]
