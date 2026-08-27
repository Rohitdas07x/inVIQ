import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.infrastructure.database.connection import SessionLocal
from app.infrastructure.database.models import User, AuditLog, Organization, Location

def sync_accounts():
    with SessionLocal() as db:
        print("=" * 60)
        print("InvIQ Account Cleanup & Super Admin Sync")
        print("=" * 60)

        # 1. Clean up old legacy accounts
        test_emails_to_remove = [
            "sayandip@inviq.io",
        ]

        for email in test_emails_to_remove:
            users_to_del = db.query(User).filter(User.email.ilike(email)).all()
            for u in users_to_del:
                user_id = u.id
                org_id = u.org_id
                print(f"🗑️  Removing user: {u.username} ({u.email}, role={u.role}, id={u.id})")
                db.query(AuditLog).filter(AuditLog.user_id == user_id).delete()
                db.delete(u)
                db.commit()
                print(f"   Deleted user {u.email}")

                if org_id:
                    other_users = db.query(User).filter(User.org_id == org_id).count()
                    if other_users == 0:
                        db.query(Location).filter(Location.org_id == org_id).delete()
                        db.query(Organization).filter(Organization.id == org_id).delete()
                        db.commit()
                        print(f"   Cleaned up isolated organization ID: {org_id}")

        # 2. Demote any other accounts claiming super_admin
        other_superadmins = db.query(User).filter(
            User.role == "super_admin",
            ~User.email.ilike("sayandipbar05@gmail.com")
        ).all()
        for sa in other_superadmins:
            print(f"⚠️  Demoting user {sa.email} from super_admin to admin")
            sa.role = "admin"
        db.commit()

        # 3. Ensure sayandipbar05@gmail.com is configured as the unique super_admin
        sa_user = db.query(User).filter(User.email.ilike("sayandipbar05@gmail.com")).first()
        if sa_user:
            print(f"👑 Configuring sayandipbar05@gmail.com as super_admin (current role: {sa_user.role})...")
            sa_user.role = "super_admin"
            sa_user.org_id = None  # Super admin is platform-wide
            sa_user.is_active = True
            sa_user.is_verified = True
            db.commit()
            print("   sayandipbar05@gmail.com is active platform super_admin.")
        else:
            print("ℹ️  sayandipbar05@gmail.com is not yet in DB (will receive super_admin on login/registration).")

        # 4. Summary of current users in database
        print("-" * 60)
        print("Current Users in Database:")
        all_users = db.query(User).order_by(User.id).all()
        for u in all_users:
            print(f" • ID: {u.id:2d} | Role: {u.role:11s} | Username: {u.username:15s} | Email: {u.email}")
        print("=" * 60)

if __name__ == "__main__":
    sync_accounts()

