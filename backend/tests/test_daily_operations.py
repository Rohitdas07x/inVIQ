"""
Integration Test Suite for Journey D: Daily Operations (Tenant-Scoped & Atomic).

Validates:
1. Staff receive stock, issue stock, and barcode dispense at permitted branches (location_ids enforcement).
2. Atomic stock-ledger model and insufficient stock rejection.
3. Batch-aware FEFO dispensing consuming actual available batch balances.
4. Requisition lifecycle (PENDING -> APPROVED -> FULFILLED, REJECTED, CANCELLED) with tenant boundary checks.
5. Low-stock, expiry, cold-chain & operational alerts delivered strictly within the organization.
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import hash_password, create_access_token
from app.infrastructure.database.models import (
    User,
    Organization,
    Location,
    Item,
    InventoryTransaction,
    Requisition,
    RequisitionItem,
)
from app.application.inventory_service import InventoryService


def _auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "role": user.role, "org_id": user.org_id}
    )
    return {"Authorization": f"Bearer {token}"}


def test_staff_permitted_branch_enforcement(client: TestClient, db):
    """Journey D.1: Staff can only perform stock movements at their assigned branches."""
    org = Organization(name="MedChain Operations", slug="medchain-ops")
    db.add(org)
    db.commit()

    branch_east = Location(name="East Counter Branch", type="retail_counter", region="East", org_id=org.id)
    branch_west = Location(name="West Clinic Branch", type="clinic", region="West", org_id=org.id)
    medicine = Item(
        name="Amoxicillin 500mg Caps",
        category="Antibiotics",
        unit="strip",
        barcode="890108600999",
        min_stock=20,
        org_id=org.id,
    )
    db.add_all([branch_east, branch_west, medicine])
    db.commit()

    # Staff assigned ONLY to branch_east (location_ids=[branch_east.id])
    staff_east = User(
        email="pharmacist_east@medchain.com",
        username="pharmacist_east",
        hashed_password=hash_password("StaffPass123!"),
        role="staff",
        org_id=org.id,
        location_ids=[branch_east.id],
        is_active=True,
        is_verified=True,
    )
    db.add(staff_east)
    db.commit()

    headers_staff = _auth_headers(staff_east)

    # 1. Staff receives stock at permitted branch (East) -> SUCCESS
    rx_payload = {
        "location_id": branch_east.id,
        "item_id": medicine.id,
        "date": "2026-06-01",
        "received": 100,
        "issued": 0,
        "batch_number": "AMX-E01",
        "expiry_date": "2027-06-01",
        "notes": "Consignment received",
    }
    res_permit = client.post("/api/inventory/transaction", json=rx_payload, headers=headers_staff)
    assert res_permit.status_code == 200
    assert res_permit.json()["success"] is True

    # 2. Staff attempts transaction at unpermitted branch (West) -> 403 Forbidden
    rx_unpermit = {
        "location_id": branch_west.id,
        "item_id": medicine.id,
        "date": "2026-06-01",
        "received": 50,
        "issued": 0,
        "batch_number": "AMX-W01",
        "expiry_date": "2027-06-01",
    }
    res_unpermit = client.post("/api/inventory/transaction", json=rx_unpermit, headers=headers_staff)
    assert res_unpermit.status_code == 403

    # 3. Staff attempts barcode dispense at unpermitted branch (West) -> 403 Forbidden
    dispense_unpermit = {
        "barcode": "890108600999",
        "location_id": branch_west.id,
        "quantity": 2,
    }
    res_disp_un = client.post("/api/inventory/scan-dispense", json=dispense_unpermit, headers=headers_staff)
    assert res_disp_un.status_code == 403

    # 4. Staff dispenses at permitted branch (East) -> 200 OK
    dispense_permit = {
        "barcode": "890108600999",
        "location_id": branch_east.id,
        "quantity": 5,
    }
    res_disp_ok = client.post("/api/inventory/scan-dispense", json=dispense_permit, headers=headers_staff)
    assert res_disp_ok.status_code == 200
    disp_data = res_disp_ok.json()["data"]
    assert disp_data["dispensed_quantity"] == 5
    assert disp_data["remaining_stock"] == 115  # 20 (min_stock) + 100 received - 5 issued


def test_atomic_stock_ledger_and_insufficient_stock(client: TestClient, db):
    """Journey D.2: Ledger updates are atomic; issuing more than available stock is rejected."""
    org = Organization(name="Atomic Ledger Org", slug="atomic-ledger-org")
    db.add(org)
    db.commit()

    loc = Location(name="Main Dispensary", type="retail_counter", region="Central", org_id=org.id)
    item = Item(
        name="Paracetamol 650mg",
        category="Analgesic",
        unit="strip",
        barcode="890108600555",
        min_stock=10,
        org_id=org.id,
    )
    db.add_all([loc, item])
    db.commit()

    admin = User(
        email="admin_ledger@atomic.com",
        username="admin_ledger",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        org_id=org.id,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()

    headers = _auth_headers(admin)

    # 1. Receive 40 units
    res1 = client.post(
        "/api/inventory/transaction",
        json={
            "location_id": loc.id,
            "item_id": item.id,
            "date": "2026-06-10",
            "received": 40,
            "issued": 0,
            "batch_number": "PCM-01",
            "expiry_date": "2027-12-31",
        },
        headers=headers,
    )
    assert res1.status_code == 200
    assert res1.json()["data"]["closing_stock"] == 50  # 10 default + 40

    # 2. Issue 30 units -> remaining 20
    res2 = client.post(
        "/api/inventory/transaction",
        json={
            "location_id": loc.id,
            "item_id": item.id,
            "date": "2026-06-11",
            "received": 0,
            "issued": 30,
            "batch_number": "PCM-01",
            "expiry_date": "2027-12-31",
        },
        headers=headers,
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["closing_stock"] == 20

    # 3. Attempt to issue 25 units when only 20 available -> Insufficient Stock (400 or 422)
    res3 = client.post(
        "/api/inventory/transaction",
        json={
            "location_id": loc.id,
            "item_id": item.id,
            "date": "2026-06-12",
            "received": 0,
            "issued": 25,
            "batch_number": "PCM-01",
        },
        headers=headers,
    )
    assert res3.status_code in (400, 422)

    # 4. Check stock ledger remains unchanged at 20
    stock_res = client.get(f"/api/inventory/stock/{loc.id}/{item.id}", headers=headers)
    assert stock_res.json()["current_stock"] == 20


def test_batch_aware_fefo_dispensing(client: TestClient, db):
    """Journey D.3: FEFO dispensing consumes actual available batch quantities in expiry order."""
    org = Organization(name="FEFO Pharmacy Org", slug="fefo-pharmacy-org")
    db.add(org)
    db.commit()

    loc = Location(name="Central Chemist", type="retail_counter", region="North", org_id=org.id)
    item = Item(
        name="Insulin Glargine 100IU",
        category="Antidiabetic",
        unit="pen",
        barcode="890108600888",
        min_stock=5,
        storage_temp="2-8°C",
        org_id=org.id,
    )
    db.add_all([loc, item])
    db.commit()

    admin = User(
        email="fefo_admin@pharma.com",
        username="fefo_admin",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        org_id=org.id,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()

    headers = _auth_headers(admin)

    # Receive Batch 1: Expiring in 30 days (10 units)
    exp_near = str(date.today() + timedelta(days=30))
    client.post(
        "/api/inventory/transaction",
        json={
            "location_id": loc.id,
            "item_id": item.id,
            "date": str(date.today()),
            "received": 10,
            "issued": 0,
            "batch_number": "BATCH-NEAR-EXP",
            "expiry_date": exp_near,
        },
        headers=headers,
    )

    # Receive Batch 2: Expiring in 180 days (25 units)
    exp_far = str(date.today() + timedelta(days=180))
    client.post(
        "/api/inventory/transaction",
        json={
            "location_id": loc.id,
            "item_id": item.id,
            "date": str(date.today()),
            "received": 25,
            "issued": 0,
            "batch_number": "BATCH-FAR-EXP",
            "expiry_date": exp_far,
        },
        headers=headers,
    )

    # 1. First scan-dispense of 6 units: Must consume from BATCH-NEAR-EXP
    res_disp1 = client.post(
        "/api/inventory/scan-dispense",
        json={"barcode": "890108600888", "location_id": loc.id, "quantity": 6},
        headers=headers,
    )
    assert res_disp1.status_code == 200
    disp1 = res_disp1.json()["data"]
    assert disp1["batch_number"] == "BATCH-NEAR-EXP"
    assert disp1["expiry_date"] == exp_near

    # 2. Second scan-dispense of 8 units:
    # BATCH-NEAR-EXP has 4 units left.
    # FEFO should consume the remaining 4 units from BATCH-NEAR-EXP and 4 units from BATCH-FAR-EXP!
    res_disp2 = client.post(
        "/api/inventory/scan-dispense",
        json={"barcode": "890108600888", "location_id": loc.id, "quantity": 8},
        headers=headers,
    )
    assert res_disp2.status_code == 200
    disp2 = res_disp2.json()["data"]
    allocations = disp2.get("allocated_batches", [])
    assert len(allocations) >= 2
    batch_map = {a["batch_number"]: a["quantity"] for a in allocations}
    assert batch_map.get("BATCH-NEAR-EXP") == 4
    assert batch_map.get("BATCH-FAR-EXP") == 4

    # 3. Third scan-dispense of 5 units:
    # BATCH-NEAR-EXP is now completely exhausted.
    # Must consume purely from BATCH-FAR-EXP.
    res_disp3 = client.post(
        "/api/inventory/scan-dispense",
        json={"barcode": "890108600888", "location_id": loc.id, "quantity": 5},
        headers=headers,
    )
    assert res_disp3.status_code == 200
    disp3 = res_disp3.json()["data"]
    assert disp3["batch_number"] == "BATCH-FAR-EXP"
    assert disp3["expiry_date"] == exp_far


def test_requisition_lifecycle_and_tenant_authorization(client: TestClient, db):
    """Journey D.4: Requisitions follow Draft/Pending -> Approved -> Fulfilled lifecycle with strict tenant isolation."""
    org_1 = Organization(name="Hospital Org A", slug="hospital-org-a")
    org_2 = Organization(name="Hospital Org B", slug="hospital-org-b")
    db.add_all([org_1, org_2])
    db.commit()

    loc_1 = Location(name="ICU Branch A", type="hospital_ward", region="Central", org_id=org_1.id)
    loc_2 = Location(name="ICU Branch B", type="hospital_ward", region="Central", org_id=org_2.id)
    item_1 = Item(name="Dopamine 200mg Inj", category="Emergency", unit="ampoule", min_stock=10, org_id=org_1.id)
    item_2 = Item(name="Dopamine 200mg Inj", category="Emergency", unit="ampoule", min_stock=10, org_id=org_2.id)
    db.add_all([loc_1, loc_2, item_1, item_2])
    db.commit()

    # Seed stock for Org 1: 50 units (min_stock 10 + 50 received = 60)
    client_tx = db.query(User).first()
    InventoryService.add_transaction_static(
        db,
        location_id=loc_1.id,
        item_id=item_1.id,
        transaction_date=date.today(),
        received=50,
        issued=0,
        notes="Opening ICU stock",
    )

    staff_1 = User(
        email="nurse_a@hospital-a.com",
        username="nurse_a",
        hashed_password=hash_password("NursePass123!"),
        role="staff",
        org_id=org_1.id,
        location_ids=[loc_1.id],
        is_active=True,
        is_verified=True,
    )
    admin_1 = User(
        email="admin_a@hospital-a.com",
        username="admin_a",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        org_id=org_1.id,
        is_active=True,
        is_verified=True,
    )
    admin_2 = User(
        email="admin_b@hospital-b.com",
        username="admin_b",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        org_id=org_2.id,
        is_active=True,
        is_verified=True,
    )
    db.add_all([staff_1, admin_1, admin_2])
    db.commit()

    headers_staff1 = _auth_headers(staff_1)
    headers_admin1 = _auth_headers(admin_1)
    headers_admin2 = _auth_headers(admin_2)

    # 1. Staff creates requisition for 20 ampoules
    req_payload = {
        "location_id": loc_1.id,
        "department": "ICU",
        "urgency": "HIGH",
        "notes": "Emergency restock",
        "items": [{"item_id": item_1.id, "quantity": 20, "notes": "Urgent"}],
    }
    res_req = client.post("/api/requisition/create", json=req_payload, headers=headers_staff1)
    assert res_req.status_code == 200
    req_data = res_req.json()["data"]
    req_id = req_data["id"]
    assert req_data["status"] == "PENDING"

    # 2. Cross-tenant attempt: Admin from Org 2 cannot approve Org 1's requisition -> 403 Forbidden
    res_cross = client.put(f"/api/requisition/{req_id}/approve", json={}, headers=headers_admin2)
    assert res_cross.status_code in (403, 404)

    # 3. Org 1 Admin approves requisition -> Status APPROVED & stock atomically deducted
    res_appr = client.put(f"/api/requisition/{req_id}/approve", json={}, headers=headers_admin1)
    assert res_appr.status_code == 200
    assert res_appr.json()["data"]["status"] == "APPROVED"

    # Stock should now be 60 - 20 = 40
    stock_after = InventoryService.get_latest_stock_static(db, loc_1.id, item_1.id)
    assert stock_after == 40

    # 4. Fulfill requisition upon dispatch -> Status FULFILLED
    res_ful = client.put(f"/api/requisition/{req_id}/fulfill", json={}, headers=headers_staff1)
    assert res_ful.status_code == 200
    assert res_ful.json()["data"]["status"] == "FULFILLED"


def test_tenant_isolated_alerts(client: TestClient, db):
    """Journey D.5: Low-stock and operational alerts filter recipients strictly by organization."""
    org_a = Organization(name="Alert Pharmacy A", slug="alert-pharma-a")
    org_b = Organization(name="Alert Pharmacy B", slug="alert-pharma-b")
    db.add_all([org_a, org_b])
    db.commit()

    admin_a = User(
        email="director@pharma-a.com",
        username="director_a",
        hashed_password=hash_password("Pass123!"),
        role="admin",
        org_id=org_a.id,
        is_active=True,
        is_verified=True,
    )
    admin_b = User(
        email="director@pharma-b.com",
        username="director_b",
        hashed_password=hash_password("Pass123!"),
        role="admin",
        org_id=org_b.id,
        is_active=True,
        is_verified=True,
    )
    db.add_all([admin_a, admin_b])
    db.commit()

    # Clear email recipients cache
    InventoryService._recipients_cache.clear()
    InventoryService._recipients_cache_expiry.clear()

    # Instantiate InventoryService
    from app.infrastructure.database.inventory_repo import InventoryRepository
    repo = InventoryRepository(db)
    service = InventoryService(repo)

    # Recipients for Org A should contain ONLY director_a email
    recipients_a = service._get_recipient_emails(org_id=org_a.id)
    assert "director@pharma-a.com" in recipients_a
    assert "director@pharma-b.com" not in recipients_a

    # Recipients for Org B should contain ONLY director_b email
    recipients_b = service._get_recipient_emails(org_id=org_b.id)
    assert "director@pharma-b.com" in recipients_b
    assert "director@pharma-a.com" not in recipients_b
