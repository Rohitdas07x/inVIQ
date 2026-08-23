"""
SMTP Email Client for InvIQ Infrastructure Layer.

Handles low-level SMTP connection management, STARTTLS handshakes, credential authentication,
MIME multi-part construction, and message delivery to mail transfer agents (MTAs).
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional, Union

from app.core.config import settings
from app.core.security import mask_email

logger = logging.getLogger("smart_inventory.infrastructure.email")


class SmtpEmailClient:
    """Production SMTP Email Client providing resilient transport for transactional and alert emails."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        enabled: Optional[bool] = None,
    ):
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._from_email = from_email
        self._from_name = from_name
        self._enabled = enabled

    @property
    def host(self) -> str:
        return self._host if self._host is not None else settings.SMTP_HOST

    @property
    def port(self) -> int:
        return self._port if self._port is not None else settings.SMTP_PORT

    @property
    def user(self) -> str:
        return self._user if self._user is not None else settings.SMTP_USER

    @property
    def password(self) -> str:
        return self._password if self._password is not None else settings.SMTP_PASSWORD

    @property
    def default_from_email(self) -> str:
        return self._from_email or settings.SMTP_FROM_EMAIL or self.user

    @property
    def default_from_name(self) -> str:
        return self._from_name or settings.SMTP_FROM_NAME or "InvIQ Smart Inventory"

    @property
    def is_enabled(self) -> bool:
        if self._enabled is not None:
            return self._enabled
        return bool(settings.SMTP_ENABLED and self.host and self.user)

    def send_email(
        self,
        to_email: Union[str, List[str]],
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        timeout: int = 30,
    ) -> bool:
        """
        Send a single email (or identical email to a small recipient list) via SMTP.

        Args:
            to_email: Single email string or list of recipient email addresses.
            subject: Email subject header.
            html_content: Optional HTML email body.
            text_content: Optional Plain-text email body.
            from_email: Sender email override (defaults to SMTP_FROM_EMAIL or SMTP_USER).
            from_name: Sender display name override (defaults to SMTP_FROM_NAME).
            reply_to: Optional Reply-To email address.
            timeout: Socket timeout in seconds.

        Returns:
            bool: True if delivered successfully to SMTP relay, False otherwise.
        """
        if not self.is_enabled:
            recipient_label = (
                mask_email(to_email)
                if isinstance(to_email, str)
                else f"{len(to_email)} recipients"
            )
            logger.info("SMTP disabled or unconfigured — email '%s' not sent to %s", subject, recipient_label)
            return False

        recipients = [to_email] if isinstance(to_email, str) else list(to_email)
        if not recipients:
            logger.warning("send_email called with empty recipient list")
            return False

        sender_email = from_email or self.default_from_email
        sender_name = from_name or self.default_from_name

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
            msg["To"] = ", ".join(recipients)
            msg["Subject"] = subject

            if reply_to:
                msg["Reply-To"] = reply_to

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            if html_content:
                msg.attach(MIMEText(html_content, "html", "utf-8"))
            elif not text_content:
                msg.attach(MIMEText("", "plain", "utf-8"))

            with smtplib.SMTP(self.host, self.port, timeout=timeout) as server:
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(sender_email, recipients, msg.as_string())

            logger.info(
                "Email '%s' sent successfully via SMTP to %s",
                subject,
                ", ".join(mask_email(r) for r in recipients[:3]) + (f" (+{len(recipients)-3} more)" if len(recipients) > 3 else ""),
            )
            return True

        except smtplib.SMTPException as exc:
            logger.error("SMTP transport error while sending '%s': %s", subject, str(exc))
            return False
        except Exception as exc:
            logger.error("Unexpected error in SmtpEmailClient.send_email: %s", str(exc))
            return False

    def send_bulk(
        self,
        recipients: List[str],
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        timeout: int = 30,
    ) -> int:
        """
        Send individually addressed emails to multiple recipients reusing a single SMTP session.

        Returns:
            int: Total count of successfully dispatched emails.
        """
        if not recipients or not self.is_enabled:
            return 0

        sender_email = from_email or self.default_from_email
        sender_name = from_name or self.default_from_name
        sent_count = 0

        try:
            with smtplib.SMTP(self.host, self.port, timeout=timeout) as server:
                server.starttls()
                server.login(self.user, self.password)

                for recipient in recipients:
                    try:
                        msg = MIMEMultipart("alternative")
                        msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
                        msg["To"] = recipient
                        msg["Subject"] = subject
                        if reply_to:
                            msg["Reply-To"] = reply_to
                        msg.attach(MIMEText(html_content, "html", "utf-8"))

                        server.sendmail(sender_email, [recipient], msg.as_string())
                        sent_count += 1
                        logger.info("Bulk alert '%s' delivered to %s", subject, mask_email(recipient))
                    except smtplib.SMTPException as err:
                        logger.warning("Failed bulk recipient delivery to %s: %s", mask_email(recipient), str(err))

        except Exception as exc:
            logger.error("SMTP session failure during bulk send: %s", str(exc))

        return sent_count


# Global singleton instance for injection and application consumption
smtp_client = SmtpEmailClient()
