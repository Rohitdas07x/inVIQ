"""
Unit and integration tests for Data Import endpoints and service layer.
"""

import io
import pytest
from app.infrastructure.database.models import Location, Item, InventoryTransaction, DataImportJob, ImportQuarantineRow
from app.application.data_import_service import DataImportService
from app.application.data_import_mapper import DataImportMapper
from tests.conftest import get_auth_header


def test_inspect_csv_file():
    csv_content = b"item_name,quantity,date,batch_number\nParacetamol 500mg,100,2026-03-28,BT-01\nAmoxicillin 250mg,50,2026-03-28,BT-02\n"
    headers, sample_rows, total_rows = DataImportService.inspect_file(csv_content, "test.csv")

    assert headers == ["item_name", "quantity", "date", "batch_number"]
    assert len(sample_rows) == 2
    assert total_rows == 2
    assert sample_rows[0]["item_name"] == "Paracetamol 500mg"


def test_heuristic_mapper():
    mapper = DataImportMapper()
    headers = ["Item Name", "Quantity Received", "Transaction Date", "Batch #"]
    sample_rows = [{"Item Name": "Paracetamol", "Quantity Received": "100", "Transaction Date": "2026-03-28", "Batch #": "B1"}]
    
    result = mapper.map_columns(headers, sample_rows, "inventory_transaction")
    mappings = result["mappings"]

    assert mappings["Item Name"]["target_field"] == "item_name"
    assert mappings["Quantity Received"]["target_field"] == "received"
    assert mappings["Transaction Date"]["target_field"] == "date"
    assert mappings["Batch #"]["target_field"] == "batch_number"


def test_upload_and_preview_endpoint(client, test_user, db):
    auth_header = get_auth_header(client, test_user["username"], test_user["password"])

    csv_content = b"Medicine,Quantity,Date\nIbuprofen 400mg,200,2026-04-01\n"
    files = {"file": ("medicines.csv", io.BytesIO(csv_content), "text/csv")}

    response = client.post(
        "/api/data-import/upload?target_entity=inventory_transaction",
        headers=auth_header,
        files=files,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "job_id" in data
    assert data["filename"] == "medicines.csv"
    assert data["total_rows"] == 1
    assert "mapping_result" in data


def test_confirm_import_and_quarantine(client, test_user, db):
    auth_header = get_auth_header(client, test_user["username"], test_user["password"])

    # Create location
    loc = db.query(Location).filter(Location.name == "Import Test Clinic").first()
    if not loc:
        loc = Location(name="Import Test Clinic", type="clinic", region="North")
        db.add(loc)
        db.commit()
        db.refresh(loc)

    # Valid row + invalid quantity row
    csv_content = (
        b"Item Name,Received,Date\n"
        b"Cough Syrup 100ml,50,2026-04-10\n"
        b"Invalid Item,NOT_A_NUMBER,2026-04-10\n"
    )
    files = {"file": ("mixed.csv", io.BytesIO(csv_content), "text/csv")}

    upload_res = client.post(
        "/api/data-import/upload?target_entity=inventory_transaction",
        headers=auth_header,
        files=files,
    )
    job_id = upload_res.json()["job_id"]

    # Confirm
    confirm_res = client.post(
        "/api/data-import/confirm",
        headers=auth_header,
        json={
            "job_id": job_id,
            "default_location_id": loc.id,
        },
    )

    assert confirm_res.status_code == 200
    res_data = confirm_res.json()
    assert res_data["success"] is True
    assert res_data["total_rows"] == 2
    assert res_data["success_rows"] == 1
    assert res_data["quarantined_rows"] == 1
    assert res_data["status"] == "PARTIAL"

    # Check job status endpoint
    status_res = client.get(f"/api/data-import/jobs/{job_id}", headers=auth_header)
    assert status_res.status_code == 200
    assert status_res.json()["success_rows"] == 1

    # Check quarantine endpoint
    quarantine_res = client.get(f"/api/data-import/jobs/{job_id}/quarantine", headers=auth_header)
    assert quarantine_res.status_code == 200
    q_data = quarantine_res.json()
    assert q_data["total_quarantined"] == 1
    assert q_data["rows"][0]["reason"] == "VALIDATION_ERROR"
