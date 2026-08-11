"""
Pydantic Schemas for Data Import endpoints.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ImportPreviewResponse(BaseModel):
    success: bool = True
    job_id: int
    filename: str
    target_entity: str
    headers: List[str]
    sample_rows: List[Dict[str, Any]]
    mapping_result: Dict[str, Any]
    mapping_cache_hit: bool
    total_rows: int
    target_schema: Dict[str, Any]


class ImportConfirmRequest(BaseModel):
    job_id: int
    mapping: Optional[Dict[str, Any]] = None  # Confirmed/adjusted column mapping
    default_location_id: Optional[int] = None


class ImportStatusResponse(BaseModel):
    success: bool = True
    job_id: int
    status: str
    target_entity: str
    filename: str
    total_rows: Optional[int] = 0
    success_rows: int = 0
    quarantined_rows: int = 0
    error_message: Optional[str] = None
    is_background: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class QuarantineRowItem(BaseModel):
    id: int
    row_number: int
    raw_data: Dict[str, Any]
    reason: str
    field_name: Optional[str] = None
    confidence_score: Optional[float] = None
    created_at: Optional[str] = None


class QuarantineListResponse(BaseModel):
    success: bool = True
    job_id: int
    total_quarantined: int
    rows: List[QuarantineRowItem]
