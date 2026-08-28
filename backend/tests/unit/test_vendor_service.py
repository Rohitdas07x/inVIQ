"""
Vendor service tests — Excel upload parsing, history, and location access.
"""

import pytest
from unittest.mock import Mock

from app.application.vendor_service import VendorService
from app.api.routes.vendor import _has_location_access
from app.infrastructure.database.models import VendorUpload


class TestVendorService:
    """Test vendor service Excel parsing logic and upload tracking."""

    def test_parse_invalid_excel_and_upload_history(self, db):
        """Test error handling on invalid file and upload history retrieval."""
        service = VendorService(db)
        result = service.parse_and_process_excel(
            file_content=b"not an excel file",
            filename="test.xlsx",
            location_id=1,
            vendor_user_id=1,
        )
        assert result["success"] is False

        # Upload tracking
        upload = VendorUpload(
            org_id=1,
            vendor_user_id=1,
            filename="test.xlsx",
            location_id=1,
            total_rows=10,
            success_rows=8,
            error_rows=2,
            status="COMPLETED_WITH_ERRORS",
        )
        db.add(upload)
        db.commit()

        uploads = service.get_uploads_for_vendor(vendor_user_id=1)
        assert len(uploads) == 1
        assert uploads[0]["filename"] == "test.xlsx"

    def test_has_location_access_formats(self):
        """Test location access helper across int lists, string lists, and JSON strings."""
        # Unrestricted
        assert _has_location_access(Mock(location_ids=None), 1) is True
        assert _has_location_access(Mock(location_ids=[]), 1) is True

        # Int & String & JSON lists
        assert _has_location_access(Mock(location_ids=[1, 2]), 1) is True
        assert _has_location_access(Mock(location_ids=[1, 2]), 3) is False
        assert _has_location_access(Mock(location_ids='[1, 2]'), 2) is True
        assert _has_location_access(Mock(location_ids='[1, 2]'), 4) is False
