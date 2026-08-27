#!/usr/bin/env python3
"""
InvIQ — Admin Congratulations Email Script
===========================================
Standalone utility script to send congratulations email to an Administrator
upon signing up in InvIQ.

Usage:
  python send_admin_congrats.py --email admin@example.com --name "Administrator" --username admin
"""

import os
import sys
import argparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Ensure backend path is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.application.notification_service import NotificationService


def send_congratulations_email(
    to_email: str = "sayandipbar05@gmail.com",
    username: str = "admin",
    full_name: str = "Sayandip Bar",
    org_name: str = "InvIQ Healthcare Network",
    smtp_host: str = None,
    smtp_port: int = None,
    smtp_user: str = None,
    smtp_password: str = None,
    from_email: str = None,
    from_name: str = None,
) -> bool:
    """
    Sends the HTML congratulations email.
    Uses settings from .env by default or explicit credentials if provided.
    """
    host = smtp_host or settings.SMTP_HOST or "smtp.gmail.com"
    port = smtp_port or settings.SMTP_PORT or 587
    user = smtp_user or settings.SMTP_USER
    password = smtp_password or settings.SMTP_PASSWORD
    sender_email = from_email or settings.SMTP_FROM_EMAIL or user or "noreply@inviq.io"
    sender_name = from_name or settings.SMTP_FROM_NAME or "InvIQ Smart Inventory"
    dashboard_url = f"{settings.FRONTEND_URL or 'http://localhost:5173'}/admin/dashboard"

    subject = "🎉 Congratulations on Joining InvIQ as Administrator!"
    display_name = full_name or username
    org_line = f" for <strong>{org_name}</strong>" if org_name else ""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }}
            .wrapper {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }}
            .header p {{ margin: 8px 0 0; opacity: 0.9; font-size: 15px; }}
            .badge {{ display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }}
            .content {{ padding: 32px 30px; }}
            .greeting {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }}
            .feature-grid {{ margin: 24px 0; display: grid; gap: 12px; }}
            .feature-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }}
            .feature-title {{ font-weight: 700; color: #4338ca; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; }}
            .feature-desc {{ font-size: 13px; color: #64748b; margin: 0; }}
            .action-box {{ text-align: center; margin: 32px 0 24px; }}
            .btn-primary {{ display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); }}
            .footer {{ background: #f1f5f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <div class="badge">InvIQ Administrator</div>
                <h1>🎉 Congratulations & Welcome!</h1>
                <p>Your Admin account is fully activated and ready</p>
            </div>
            <div class="content">
                <div class="greeting">Hello {display_name},</div>
                <p>
                    Congratulations on signing up as an <strong>Administrator</strong>{org_line} on <strong>InvIQ</strong> — the intelligent healthcare supply chain and inventory management platform.
                </p>
                <p>
                    With your Admin privileges, you have complete oversight and command of your operations:
                </p>
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-title">📊 Multi-Location Inventory Control</div>
                        <p class="feature-desc">Monitor real-time stock levels, batch numbers, expiry dates, and cold-chain compliance across all warehouses and clinics.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-title">🤖 AI Assistant & Semantic Memory</div>
                        <p class="feature-desc">Ask complex operational queries, trigger automated reconciliations, and tap into conversational memory powered by Groq & Gemini.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-title">📥 AI-Powered Data Import</div>
                        <p class="feature-desc">Instantly map and ingest vendor CSV and Excel delivery files with automated column matching and confidence gating.</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-title">⚡ Requisitions & Role Access</div>
                        <p class="feature-desc">Approve or reject stock requisition requests, invite team members, and manage staff permissions.</p>
                    </div>
                </div>
                <div class="action-box">
                    <a href="{dashboard_url}" class="btn-primary">Launch Admin Dashboard →</a>
                </div>
                <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 20px;">
                    Username: <strong>{username}</strong> | Registered Email: <strong>{to_email}</strong>
                </p>
            </div>
            <div class="footer">
                <p>This automated message was sent to confirm your administrator onboarding.</p>
                <p>&copy; 2026 InvIQ — Intelligent Healthcare Inventory Management System</p>
            </div>
        </div>
    </body>
    </html>
    """

    print(f"📧 Preparing congratulations email:")
    print(f"   To: {to_email}")
    print(f"   Subject: {subject}")
    print(f"   SMTP Host: {host}:{port}")

    if not user or not password:
        print("\n⚠️  SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not set in .env.")
        print("   To send live emails, configure SMTP_USER (your Gmail/email) and SMTP_PASSWORD (App Password) in .env or via CLI.")
        print("\n✅ HTML email template rendered successfully (Preview ready).")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html"))

        print(f"Connecting to SMTP server {host}:{port}...")
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f"✨ Successfully sent congratulations email to {to_email}!")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send congratulations email to InvIQ Admin")
    parser.add_argument(
        "--email",
        default="sayandipbar05@gmail.com",
        help="Recipient email address (default: sayandipbar05@gmail.com)",
    )
    parser.add_argument(
        "--username",
        default="admin",
        help="Admin username (default: admin)",
    )
    parser.add_argument(
        "--name",
        default="Sayandip Bar",
        help="Admin full name (default: Sayandip Bar)",
    )
    parser.add_argument(
        "--org",
        default="InvIQ Healthcare",
        help="Organization name (default: InvIQ Healthcare)",
    )
    parser.add_argument("--smtp-user", help="SMTP username / email")
    parser.add_argument("--smtp-password", help="SMTP app password")

    args = parser.parse_args()

    send_congratulations_email(
        to_email=args.email,
        username=args.username,
        full_name=args.name,
        org_name=args.org,
        smtp_user=args.smtp_user,
        smtp_password=args.smtp_password,
    )
