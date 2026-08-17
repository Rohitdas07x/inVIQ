#!/usr/bin/env python3
"""
Secure Super-Admin Provisioning & Rotation CLI for InvIQ Platform.

Usage:
    python scripts/provision_super_admin.py --email admin@inviq.io --username superadmin --password "StrongRandomPassword123!"
    python scripts/provision_super_admin.py --interactive
    python scripts/provision_super_admin.py --rotate --email admin@inviq.io
"""

import argparse
import getpass
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.infrastructure.database.connection import SessionLocal
from app.infrastructure.database.models import User, Organization
from app.core.security import hash_password, validate_password_strength


def provision_super_admin(email: str, username: str, password: str, full_name: str = "Platform Super Admin"):
    # Validate password strength
    is_valid, msg = validate_password_strength(password)
    if not is_valid:
        print(f"[ERROR] Password does not meet security requirements: {msg}")
        sys.exit(1)

    with SessionLocal() as db:
        existing_user = db.query(User).filter(User.email.ilike(email.strip())).first()
        if existing_user:
            print(f"[INFO] User with email {email} already exists. Updating to super_admin role and rotating password...")
            existing_user.username = username.strip()
            existing_user.hashed_password = hash_password(password)
            existing_user.role = "super_admin"
            existing_user.is_active = True
            existing_user.is_verified = True
            existing_user.login_attempts = 0
            existing_user.locked_until = None
            db.commit()
            print(f"[SUCCESS] Super-admin account '{email}' updated and password rotated successfully.")
            return

        super_admin = User(
            email=email.strip().lower(),
            username=username.strip(),
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            role="super_admin",
            is_active=True,
            is_verified=True,
            org_id=None,  # Platform-wide super_admin is not tied to any single tenant org
        )
        db.add(super_admin)
        db.commit()
        print(f"[SUCCESS] Super-admin account '{email}' (username: {username}) provisioned successfully.")


def main():
    parser = argparse.ArgumentParser(description="Provision or Rotate InvIQ Super-Admin Account")
    parser.add_argument("--email", type=str, help="Super admin email address")
    parser.add_argument("--username", type=str, default="superadmin", help="Super admin username")
    parser.add_argument("--password", type=str, help="Super admin secure password")
    parser.add_argument("--name", type=str, default="Platform Super Admin", help="Full name")
    parser.add_argument("--interactive", action="store_true", help="Prompt for credentials interactively")

    args = parser.parse_args()

    if args.interactive or not (args.email and args.password):
        email = input("Enter Super Admin Email: ").strip()
        username = input("Enter Super Admin Username [default: superadmin]: ").strip() or "superadmin"
        name = input("Enter Full Name [default: Platform Super Admin]: ").strip() or "Platform Super Admin"
        password = getpass.getpass("Enter Super Admin Password: ").strip()
        confirm = getpass.getpass("Confirm Super Admin Password: ").strip()

        if password != confirm:
            print("[ERROR] Passwords do not match.")
            sys.exit(1)
    else:
        email = args.email
        username = args.username
        name = args.name
        password = args.password

    provision_super_admin(email=email, username=username, password=password, full_name=name)


if __name__ == "__main__":
    main()
