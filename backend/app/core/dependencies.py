"""
FastAPI dependency injection factories.

Implements the FastAPI tutorial OAuth2 + JWT pattern:
  https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/

get_current_user() receives token: str = Depends(oauth2_scheme)
where oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login").
This wires up the Swagger /docs "Authorize" button automatically.

Route handlers use Depends() to receive pre-validated user objects.
"""

from typing import Annotated, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.infrastructure.database.connection import get_db
from app.infrastructure.database.inventory_repo import InventoryRepository
from app.infrastructure.database.requisition_repo import RequisitionRepository
from app.infrastructure.database.user_repo import UserRepository
from app.application.inventory_service import InventoryService
from app.application.requisition_service import RequisitionService
from app.core.security import oauth2_scheme, verify_access_token, check_role_permission
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.infrastructure.database.models import User


# ── Repository factories ───────────────────────────────────────────────────


def get_inventory_repo(db: Session = Depends(get_db)) -> InventoryRepository:
    return InventoryRepository(db)


def get_requisition_repo(db: Session = Depends(get_db)) -> RequisitionRepository:
    return RequisitionRepository(db)


def get_user_repo(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_db_session(db: Session = Depends(get_db)) -> Session:
    """Raw database session for direct DB operations."""
    return db


def get_inventory_service(
    repo: InventoryRepository = Depends(get_inventory_repo),
) -> InventoryService:
    return InventoryService(repo)


def get_requisition_service(
    repo: RequisitionRepository = Depends(get_requisition_repo),
    inv_repo: InventoryRepository = Depends(get_inventory_repo),
) -> RequisitionService:
    return RequisitionService(repo, inv_repo)


# ── Authentication dependency (FastAPI tutorial pattern) ───────────────────


import time
import threading

_user_auth_cache = {}
_user_auth_cache_lock = threading.Lock()


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode and validate the Bearer JWT token or HttpOnly cookie on every protected request.
    Uses fast L1 memory cache (30s) to avoid redundant DB and Redis round-trips.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    # 1. Fast L1 auth cache check (<0.05ms) — cache validated user_id to skip JWT + Redis decode

    now = time.time()
    cached_user_id = None
    with _user_auth_cache_lock:
        cached = _user_auth_cache.get(token)
        if cached is not None:
            exp_ts, uid = cached
            if now < exp_ts:
                cached_user_id = uid
            else:
                _user_auth_cache.pop(token, None)

    if cached_user_id is not None:
        # ── Check blacklist FIRST — a logged-out token must not ride the L1 cache ──
        from app.infrastructure.cache.token_blacklist import is_token_blacklisted
        if is_token_blacklisted(token):
            with _user_auth_cache_lock:
                _user_auth_cache.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(cached_user_id)
        if user and user.is_active:
            return user
        with _user_auth_cache_lock:
            _user_auth_cache.pop(token, None)


    try:
        # ── Check token blacklist (invalidated on logout) ──────────────
        from app.infrastructure.cache.token_blacklist import is_token_blacklisted

        if is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # ── Decode and verify JWT ──────────────────────────────────────
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        # ── Load user from database ────────────────────────────────────
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        if user is None:
            raise credentials_exception
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # ── Check if token was issued before a password reset ──────────
        try:
            from app.infrastructure.cache.redis_client import get_redis, is_redis_available
            r = get_redis()
            if r and is_redis_available():
                pw_changed_ts = r.get(f"user_pw_changed:{user.id}")
                if pw_changed_ts:
                    token_iat = payload.get("iat", 0)
                    if token_iat < int(pw_changed_ts):
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Session invalidated after password reset. Please log in again.",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
        except HTTPException:
            raise
        except Exception:
            pass  # Redis unavailable — skip check, don't break auth

        # Populate L1 cache with validated user_id (30s TTL)
        with _user_auth_cache_lock:
            if len(_user_auth_cache) < 5000:
                _user_auth_cache[token] = (now + 30.0, user.id)

        return user


    except HTTPException:
        raise
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:

        raise credentials_exception


# ── Active user shorthand ──────────────────────────────────────────────────


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Shorthand — get current user and assert account is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# ── Role-based access control ──────────────────────────────────────────────


def require_role(required_role: str):
    """Factory for role-based route protection."""

    def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if not check_role_permission(current_user.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Requires '{required_role}' role or higher.",
            )
        return current_user

    return role_checker


def require_admin(
    current_user: Annotated[User, Depends(require_role("admin"))],
) -> User:
    return current_user


def require_staff(
    current_user: Annotated[User, Depends(require_role("staff"))],
) -> User:
    return current_user


def require_super_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Only the platform super_admin can access these endpoints."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required.",
        )
    return current_user


def require_vendor(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Vendor or higher role (vendor → staff → admin → super_admin)."""
    if not check_role_permission(current_user.role, "vendor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor access required.",
        )
    return current_user


def get_caller_org_id(user: User) -> Optional[int]:
    """
    Return org_id for tenant-scoped operations.
    - super_admin bypasses org scoping (returns None).
    - All normal users must belong to an organization; if org_id is None, raises AuthorizationError (403).
    """
    if user.role == "super_admin":
        return None
    if user.org_id is None:
        raise AuthorizationError("User is not assigned to an organization")
    return user.org_id


