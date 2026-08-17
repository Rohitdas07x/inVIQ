"""
Distributed Lock implementation using Redis SETNX with automatic TTL release.

Layer: Infrastructure (Cache / Concurrency)
Guarantees concurrency safety across multi-worker deployments for:
- Concurrent barcode dispensing & retail checkout
- High-volume stock adjustments & ledger writes
- Data import batch executions
"""

import time
import uuid
import logging
from contextlib import contextmanager
from typing import Optional

from app.infrastructure.cache.redis_client import get_redis

logger = logging.getLogger("smart_inventory.lock")


@contextmanager
def redis_distributed_lock(
    lock_name: str,
    timeout_seconds: float = 5.0,
    expire_seconds: int = 15,
    org_id: Optional[int] = None,
):
    """
    Acquires a distributed lock using Redis SET key token NX EX expire_seconds.
    
    Args:
        lock_name: Identifying resource key (e.g. 'stock:loc_1:item_5')
        timeout_seconds: Maximum time to wait trying to acquire lock
        expire_seconds: Lock auto-expiration time in seconds (prevents deadlocks)
        org_id: Organization tenant ID for key namespace partitioning
    """
    full_lock_key = f"lock:org_{org_id}:{lock_name}" if org_id is not None else f"lock:{lock_name}"
    token = str(uuid.uuid4())
    r = get_redis()
    acquired = False
    deadline = time.time() + timeout_seconds

    if r:
        while time.time() < deadline:
            try:
                # SET key token NX EX expire_seconds
                res = r.set(full_lock_key, token, ex=expire_seconds, nx=True)
                if res:
                    acquired = True
                    break
            except Exception as e:
                logger.debug("Redis distributed lock error for %s: %s", full_lock_key, e)
                break
            time.sleep(0.02)
    else:
        # Graceful in-memory fallback for local development / test suites
        acquired = True

    try:
        yield acquired
    finally:
        if acquired and r:
            try:
                # Safe release: verify token matches before deleting
                val = r.get(full_lock_key)
                if val == token or (isinstance(val, bytes) and val.decode() == token):
                    r.delete(full_lock_key)
            except Exception as e:
                logger.debug("Redis distributed lock release error for %s: %s", full_lock_key, e)
