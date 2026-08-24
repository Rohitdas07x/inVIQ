"""
Workers package for asynchronous Celery background tasks and queues.
"""

from app.workers.celery_app import celery_app

__all__ = ["celery_app"]
