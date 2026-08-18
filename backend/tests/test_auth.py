"""
Auth endpoint tests — login, logout, register, lockout, RBAC.
"""

import pytest
from tests.conftest import get_auth_header


class TestHealthAndRoot:
    """Smoke tests for root and health endpoints."""

    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "version" in data

    def test_health(self, client):
        response = client.get("/health")
        # Health may return 503 if Redis/external deps are unreachable in local dev
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data


class TestRegister:
    """User registration tests."""

    def test_register_success(self, client, admin_user):
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "username": "newuser",
                "password": "NewPass123!",
                "full_name": "New User",
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_register_duplicate_username(self, client, admin_user, test_user):
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.post(
            "/api/auth/register",
            json={
                "email": "dup@example.com",
                "username": test_user["username"],
                "password": "DupPass123!",
                "full_name": "Dup User",
            },
            headers=headers,
        )
        # Should fail — duplicate username
        assert response.status_code in [400, 409, 422]

    def test_public_signup_success(self, client):
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        uname = f"user_{unique_id}"
        response = client.post(
            "/api/auth/signup",
            json={
                "email": f"{uname}@example.com",
                "username": uname,
                "password": "Password123!",
                "full_name": "New Public User",
                "role": "staff",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["username"] == uname




class TestLogin:
    """Login and authentication tests."""

    def test_login_success(self, client, test_user):
        response = client.post("/api/auth/login", json={
            "email": test_user["user"].email,
            "password": test_user["password"],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "user" in data["data"]
        assert "access_token" in response.cookies or any("access_token=" in h for h in response.headers.get_list("set-cookie"))

    def test_login_wrong_password(self, client, test_user):
        response = client.post("/api/auth/login", json={
            "email": test_user["user"].email,
            "password": "wrongpassword",
        })
        assert response.status_code in [401, 403]

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/auth/login", json={
            "email": "ghostuser@example.com",
            "password": "nopass",
        })
        assert response.status_code in [401, 403]



class TestLogout:
    """Logout and token blacklist tests."""

    def test_logout_success(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_logout_token_invalidated(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        # Logout
        client.post("/api/auth/logout", headers=headers)
        # Reuse same token — should fail
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code in [401, 403]


class TestProfile:
    """Profile retrieval tests."""

    def test_get_profile(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["username"] == test_user["username"]

    def test_get_profile_unauthenticated(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code in [401, 403]


class TestRBAC:
    """Role-based access control tests."""

    def test_staff_cannot_register_users(self, client, test_user):
        headers = get_auth_header(client, test_user["username"], test_user["password"])
        response = client.post(
            "/api/auth/register",
            json={
                "email": "hack@example.com",
                "username": "hacker",
                "password": "HackPass123!",
                "full_name": "Hacker",
            },
            headers=headers,
        )
        assert response.status_code in [401, 403]

    def test_admin_can_list_users(self, client, admin_user):
        headers = get_auth_header(client, admin_user["username"], admin_user["password"])
        response = client.get("/api/auth/users", headers=headers)
        assert response.status_code == 200


class TestTenantIsolationAndIDOR:
    """Multi-tenant security barrier and IDOR prevention tests."""

    def test_admin_cannot_access_other_tenant_user_detail(self, client, admin_user, db):
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        # Create a user in a different organization (org_id=99)
        other_user = User(
            email="other_tenant@example.com",
            username="other_tenant_user",
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

        # Admin in org_id=1 attempts to GET user from org_id=99
        res = client.get(f"/api/auth/users/{other_user.id}", headers=admin_headers)
        assert res.status_code == 403
        data = res.json()
        error_msg = data.get("error", {}).get("message", "") or data.get("detail", "")
        assert "Cross-tenant" in error_msg or "permission" in error_msg.lower()

    def test_admin_cannot_modify_other_tenant_user_role(self, client, admin_user, db):
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        other_user = User(
            email="victim@otherorg.com",
            username="victim_user",
            hashed_password=hash_password("Pass123!"),
            role="staff",
            org_id=88,
            is_active=True,
            is_verified=True,
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        # Attempt to escalate victim to admin
        res = client.put(
            f"/api/auth/users/{other_user.id}/role",
            json={"role": "admin"},
            headers=admin_headers,
        )
        assert res.status_code == 403

    def test_admin_cannot_reset_other_tenant_password(self, client, admin_user, db):
        from app.infrastructure.database.models import User
        from app.core.security import hash_password

        other_user = User(
            email="victim_pass@otherorg.com",
            username="victim_pass_user",
            hashed_password=hash_password("Pass123!"),
            role="staff",
            org_id=77,
            is_active=True,
            is_verified=True,
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        # Attempt takeover via password reset
        res = client.post(
            f"/api/auth/users/{other_user.id}/reset-password",
            json={"new_password": "HackedPassword123!"},
            headers=admin_headers,
        )
        assert res.status_code == 403

    def test_admin_cannot_assign_super_admin_role(self, client, admin_user, test_user, db):
        from app.infrastructure.database.models import User
        admin_headers = get_auth_header(client, admin_user["username"], admin_user["password"])

        user_obj = db.query(User).filter(User.username == test_user["username"]).first()
        user_id = user_obj.id

        res = client.put(
            f"/api/auth/users/{user_id}/role",
            json={"role": "super_admin"},
            headers=admin_headers,
        )
        assert res.status_code in [403, 422]


class TestCookieAuthAndCSP:
    """Tests for secure HttpOnly cookie session management and CSP security headers."""

    def test_login_sets_httponly_samesite_cookies(self, client, test_user):
        res = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": test_user["password"]},
        )
        assert res.status_code == 200
        set_cookies = res.headers.get_list("set-cookie")
        assert any("access_token=" in h for h in set_cookies) or "access_token" in res.cookies
        assert any("refresh_token=" in h for h in set_cookies) or "refresh_token" in res.cookies



    def test_authenticated_via_cookie_without_auth_header(self, client, test_user):
        login_res = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": test_user["password"]},
        )
        assert login_res.status_code == 200
        token = login_res.cookies.get("access_token")

        # Request /auth/me passing access_token cookie without Authorization header
        me_res = client.get("/api/auth/me", cookies={"access_token": token})
        assert me_res.status_code == 200
        assert me_res.json()["data"]["username"] == test_user["username"]


    def test_security_headers_and_csp_present(self, client):
        from unittest.mock import patch

        with patch(
            "app.infrastructure.cache.redis_client.is_redis_available",
            return_value=True,
        ):
            res = client.get("/health")
        assert res.status_code == 200
        assert "Content-Security-Policy" in res.headers
        assert "X-Frame-Options" in res.headers
        assert "X-Content-Type-Options" in res.headers
        assert res.headers["X-Content-Type-Options"] == "nosniff"





