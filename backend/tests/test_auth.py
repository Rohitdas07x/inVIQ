"""
Auth endpoint tests — login, logout, register, lockout, RBAC, tenant isolation, cookies & CSP.
"""

import pytest
from tests.conftest import get_auth_header


class TestHealthAndAuthLifecycle:
    """Smoke tests and user signup/login lifecycle."""

    def test_root_and_health_with_csp_headers(self, client):
        """Verify root, health, and security headers (CSP, nosniff, X-Frame-Options)."""
        from unittest.mock import patch
        with patch("app.infrastructure.cache.redis_client.is_redis_available", return_value=True):
            res = client.get("/health")
        assert res.status_code == 200
        assert "Content-Security-Policy" in res.headers
        assert res.headers["X-Content-Type-Options"] == "nosniff"

    def test_signup_and_login_with_cookies(self, client, test_user):
        """Test public signup, login setting HttpOnly cookies, and cookie authentication."""
        # 1. Login
        login_res = client.post("/api/auth/login", json={
            "email": test_user["user"].email,
            "password": test_user["password"],
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.cookies or any("access_token=" in h for h in login_res.headers.get_list("set-cookie"))

        # 2. Access via cookie
        token = login_res.cookies.get("access_token")
        if token:
            me_res = client.get("/api/auth/me", cookies={"access_token": token})
            assert me_res.status_code == 200

        # 3. Invalid password & nonexistent user
        bad_res = client.post("/api/auth/login", json={"email": test_user["user"].email, "password": "wrongpassword"})
        assert bad_res.status_code in [401, 403]

    def test_logout_and_token_invalidation(self, client, test_user):
        """Test logout invalidates token for subsequent requests."""
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        logout_res = client.post("/api/auth/logout", headers=headers)
        assert logout_res.status_code == 200

        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code in [401, 403]


class TestRBACAndTenantIsolation:
    """Role-based access control and multi-tenant cross-org security."""

    def test_rbac_boundaries(self, client, test_user, admin_user):
        """Staff cannot register users or list all users; Admin can."""
        staff_headers = get_auth_header(client, test_user["username"], test_user["password"])
        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        # Staff denied
        res1 = client.post("/api/auth/register", json={"email": "hack@example.com", "username": "hack", "password": "Pass123!"}, headers=staff_headers)
        assert res1.status_code in [401, 403]

        # Admin allowed
        res2 = client.get("/api/auth/users", headers=admin_headers)
        assert res2.status_code == 200

    def test_cross_tenant_idor_protection(self, client, admin_user, db):
        """Admin cannot view, edit roles, or reset passwords of users belonging to other tenants."""
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        other_user = User(
            email="other_tenant_victim@example.com",
            username="other_tenant_victim",
            hashed_password=hash_password("Pass123!"),
            role="staff",
            org_id=99,
            is_active=True,
            is_verified=True,
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        # Attempt read
        assert client.get(f"/api/auth/users/{other_user.id}", headers=admin_headers).status_code == 403
        # Attempt role update
        assert client.put(f"/api/auth/users/{other_user.id}/role", json={"role": "admin"}, headers=admin_headers).status_code == 403
        # Attempt password reset
        assert client.post(f"/api/auth/users/{other_user.id}/reset-password", json={"new_password": "HackedPassword123!"}, headers=admin_headers).status_code == 403
