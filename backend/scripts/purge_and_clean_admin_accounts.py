import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.infrastructure.database.connection import SessionLocal
from app.infrastructure.database.models import User, AuditLog, Organization, Location, InventoryTransaction, BillingSession

import argparse

def purge_accounts(extra_emails=None):
    with SessionLocal() as db:
        print("=" * 65)
        print("🧹 PURGING LEGACY TEST ACCOUNTS FROM DATABASE")
        print("=" * 65)

        target_emails = [
            "sayandip@inviq.io",
        ]
        if extra_emails:
            target_emails.extend(extra_emails)

        for email in target_emails:
            users = db.query(User).filter(User.email.ilike(email)).all()
            for u in users:
                user_id = u.id
                org_id = u.org_id
                print(f"🗑️  Purging user: {u.username} | Email: {u.email} | Role: {u.role} (ID: {user_id})")
                
                # Delete audit logs
                del_audits = db.query(AuditLog).filter(AuditLog.user_id == user_id).delete()
                print(f"    - Deleted {del_audits} associated audit log entries")
                
                # Delete user
                db.delete(u)
                db.commit()
                print(f"    - Deleted user record {u.email}")

                # If org has no other users and was an isolated test org, clean it up
                if org_id and org_id not in (1, 2):  # Keep seed tenant orgs 1 & 2
                    other_users = db.query(User).filter(User.org_id == org_id).count()
                    if other_users == 0:
                        db.query(Location).filter(Location.org_id == org_id).delete()
                        db.query(Organization).filter(Organization.id == org_id).delete()
                        db.commit()
                        print(f"    - Cleaned up isolated test organization ID: {org_id}")

        # Also purge any dangling user with username 'superadmin' if tied to an old email
        dangling_super = db.query(User).filter(User.username == "superadmin").all()
        for su in dangling_super:
            print(f"🗑️  Purging dangling superadmin: {su.username} ({su.email})")
            db.query(AuditLog).filter(AuditLog.user_id == su.id).delete()
            db.delete(su)
            db.commit()

        print("\n" + "-" * 65)
        print("CURRENT USERS REMAINING IN DATABASE:")
        print("-" * 65)
        remaining_users = db.query(User).order_by(User.id).all()
        if not remaining_users:
            print(" (No users in database)")
        for u in remaining_users:
            print(f" • ID: {u.id:2d} | Role: {u.role:11s} | Username: {u.username:15s} | Email: {u.email}")
        print("=" * 65)
        print("✅ Cleanup complete! You can now register freshly.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Purge specific accounts from database")
    parser.add_argument("--email", nargs="*", help="Optional specific emails to purge")
    args = parser.parse_args()
    purge_accounts(extra_emails=args.email)
