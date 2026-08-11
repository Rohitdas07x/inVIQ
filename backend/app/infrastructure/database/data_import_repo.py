"""
Data import repository — database operations for data import jobs and quarantine records.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional, List, Dict, Any

from app.infrastructure.database.models import DataImportJob, ImportQuarantineRow
from app.core.exceptions import DatabaseError

logger = logging.getLogger("smart_inventory.repo.data_import")


class DataImportRepository:
    """Encapsulates all data-import-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_job(
        self,
        uploaded_by_user_id: int,
        filename: str,
        target_entity: str,
        org_id: Optional[int] = None,
        file_content: Optional[bytes] = None,
        total_rows: Optional[int] = None,
        mapping_result: Optional[Dict[str, Any]] = None,
        mapping_cache_hit: bool = False,
        status: str = "PENDING",
    ) -> DataImportJob:
        try:
            job = DataImportJob(
                uploaded_by_user_id=uploaded_by_user_id,
                org_id=org_id,
                filename=filename,
                target_entity=target_entity,
                file_content=file_content,
                total_rows=total_rows,
                mapping_result=mapping_result,
                mapping_cache_hit=mapping_cache_hit,
                status=status,
            )
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)
            return job
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error("Database error creating data import job: %s", str(e))
            raise DatabaseError(f"Failed to create data import job: {str(e)}")

    def get_job(self, job_id: int) -> Optional[DataImportJob]:
        try:
            return self.db.query(DataImportJob).filter(DataImportJob.id == job_id).first()
        except SQLAlchemyError as e:
            logger.error("Database error getting data import job #%d: %s", job_id, str(e))
            raise DatabaseError(f"Failed to get data import job: {str(e)}")

    def update_job(self, job: DataImportJob) -> DataImportJob:
        try:
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)
            return job
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error("Database error updating data import job #%d: %s", job.id, str(e))
            raise DatabaseError(f"Failed to update data import job: {str(e)}")

    def add_quarantine_rows_bulk(self, rows_data: List[Dict[str, Any]]) -> None:
        """Bulk insert quarantine records within the current transaction."""
        if not rows_data:
            return
        try:
            quarantine_objects = [
                ImportQuarantineRow(
                    job_id=r["job_id"],
                    row_number=r["row_number"],
                    raw_data=r["raw_data"],
                    reason=r["reason"],
                    field_name=r.get("field_name"),
                    confidence_score=r.get("confidence_score"),
                )
                for r in rows_data
            ]
            self.db.add_all(quarantine_objects)
        except SQLAlchemyError as e:
            logger.error("Database error adding quarantine rows bulk: %s", str(e))
            raise DatabaseError(f"Failed to record quarantined rows: {str(e)}")

    def get_quarantined_rows(self, job_id: int, limit: int = 200, skip: int = 0) -> List[ImportQuarantineRow]:
        try:
            return (
                self.db.query(ImportQuarantineRow)
                .filter(ImportQuarantineRow.job_id == job_id)
                .order_by(ImportQuarantineRow.row_number.asc())
                .offset(skip)
                .limit(limit)
                .all()
            )
        except SQLAlchemyError as e:
            logger.error("Database error fetching quarantined rows for job #%d: %s", job_id, str(e))
            raise DatabaseError(f"Failed to fetch quarantined rows: {str(e)}")

    def count_quarantined(self, job_id: int) -> int:
        try:
            return self.db.query(ImportQuarantineRow).filter(ImportQuarantineRow.job_id == job_id).count()
        except SQLAlchemyError as e:
            logger.error("Database error counting quarantined rows for job #%d: %s", job_id, str(e))
            raise DatabaseError(f"Failed to count quarantined rows: {str(e)}")
