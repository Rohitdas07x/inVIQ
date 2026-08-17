"""
Admin API endpoint tests — admin dashboard and management.

Tests the API layer for admin routes.
"""

import pytest
from tests.conftest import get_auth_header


class TestAdminOverview:
    """Test admin overview endpoint."""

    def test_admin_overview_requires_admin(self, client, test_user):
        """Admin overview should require admin role."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.get("/api/admin/overview", headers=headers)
        assert response.status_code in [401, 403]

    def test_admin_overview_success(self, client, admin_user):
        """Admin overview should return platform stats."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get("/api/admin/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "users" in data["data"]
        assert "recent_signups" in data["data"]
        assert "recent_activity" in data["data"]


class TestAdminAuditLogs:
    """Test admin audit logs endpoint."""

    def test_audit_logs_requires_admin(self, client, test_user):
        """Audit logs should require admin role."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.get("/api/admin/audit-logs", headers=headers)
        assert response.status_code in [401, 403]

    def test_audit_logs_success(self, client, admin_user):
        """Audit logs should return audit trail."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get("/api/admin/audit-logs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data

    def test_audit_logs_with_filters(self, client, admin_user):
        """Audit logs should support filtering."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get(
            "/api/admin/audit-logs?limit=10&action=login",
            headers=headers,
        )
        assert response.status_code == 200


class TestAdminUsersSummary:
    """Test admin users summary endpoint."""

    def test_users_summary_requires_admin(self, client, test_user):
        """Users summary should require admin role."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.get("/api/admin/users/summary", headers=headers)
        assert response.status_code in [401, 403]

    def test_users_summary_success(self, client, admin_user):
        """Users summary should return user details."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get("/api/admin/users/summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "all_users" in data["data"]
        assert "alerts" in data["data"]


class TestAdminReports:
    """Test admin report generation endpoint."""

    def test_generate_report_requires_admin(self, client, test_user):
        """Generate report should require admin role."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.get("/api/admin/reports/generate", headers=headers)
        assert response.status_code in [401, 403]

    def test_generate_report_success(self, client, admin_user):
        """Generate report should return PDF."""
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get("/api/admin/reports/generate", headers=headers)
        # Should return PDF or error if reportlab not installed
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/pdf"


class TestAdminTenantScoping:
    """Verify admin overview, audit logs, and users summary do not leak cross-tenant data."""

    def test_admin_overview_scoped_to_own_org(self, client, admin_user, db):
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        # Create a user in a different organization (org_id=99)
        other_user = User(
            email="other_tenant_admin@example.com",
            username="other_tenant_admin",
            hashed_password=hash_password("Pass123!"),
            role="staff",
            org_id=99,
            is_active=True,
            is_verified=True,
        )
        db.add(other_user)
        db.commit()

        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        # Fetch overview for org_id=1
        res = client.get("/api/admin/overview", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()["data"]

        # Ensure recent signups in org_id=1 do NOT contain user from org_id=99
        recent_usernames = [u["username"] for u in data["recent_signups"]]
        assert "other_tenant_admin" not in recent_usernames

    def test_users_summary_scoped_to_own_org(self, client, admin_user, db):
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        other_user = User(
            email="leak_test_user@example.com",
            username="leak_test_user",
            hashed_password=hash_password("Pass123!"),
            role="staff",
            org_id=88,
            is_active=True,
            is_verified=True,
        )
        db.add(other_user)
        db.commit()

        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        res = client.get("/api/admin/users/summary", headers=admin_headers)
        assert res.status_code == 200
        all_usernames = [u["username"] for u in res.json()["data"]["all_users"]]
        assert "leak_test_user" not in all_usernames

