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
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]

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
