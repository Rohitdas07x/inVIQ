import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database.models import User, Location, Item, ItemPackaging, InventoryTransaction, Organization, Requisition
from app.application.requisition_service import RequisitionService
from app.infrastructure.database.requisition_repo import RequisitionRepository
from app.infrastructure.database.inventory_repo import InventoryRepository
from app.application.inventory_service import InventoryService
from tests.conftest import get_auth_header


@pytest.fixture
def req_uom_env(db, admin_user):
    client = TestClient(app)

    # Ensure Org 1 exists
    org = db.query(Organization).filter(Organization.id == 1).first()
    if not org:
        org = Organization(
            id=1,
            name="Req UOM Test Pharmacy",
            slug="req-uom-test-pharmacy",
            plan="single_pharmacy",
        )
        db.add(org)
        db.commit()

    # Create location
    loc = db.query(Location).filter(Location.id == 60).first()
    if not loc:
        loc = Location(
            id=60,
            org_id=1,
            name="Emergency Ward Pharmacy",
            type="department_store",
            region="East",
        )
        db.add(loc)
        db.commit()

    headers = get_auth_header(client, admin_user["username"], admin_user["password"])
    return client, headers, loc


def test_requisition_uom_lifecycle(req_uom_env, db):
    client, headers, loc = req_uom_env

    # 1. Create item with base unit "tablet" and box packaging tier (multiplier 100)
    item = db.query(Item).filter(Item.name == "Amoxicillin 500mg UOM").first()
    if not item:
        item = Item(
            name="Amoxicillin 500mg UOM",
            category="antibiotics",
            unit="tablet",
            mrp=10.0,
            purchase_rate=6.0,
            min_stock=100,
            org_id=1,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        pkg_box = ItemPackaging(
            item_id=item.id,
            org_id=1,
            unit_name="box",
            multiplier=100,
            mrp=950.0,
            purchase_rate=550.0,
        )
        db.add(pkg_box)
        db.commit()

    # 2. Add 500 base tablets to stock
    inv_repo = InventoryRepository(db)
    inv_service = InventoryService(inv_repo)

    inv_service.add_transaction(
        location_id=loc.id,
        item_id=item.id,
        transaction_date=date.today(),
        received=500,
        issued=0,
        notes="Opening stock for requisition test",
    )

    # 3. Create requisition requesting 2 BOXES
    req_repo = RequisitionRepository(db)
    req_service = RequisitionService(req_repo, inv_repo)
    create_res = req_service.create_requisition(
        location_id=loc.id,
        requested_by="Dr. Sarah",
        department="ICU",
        urgency="HIGH",
        items=[
            {
                "item_id": item.id,
                "quantity": 2,
                "packaging_unit": "box",
                "notes": "Emergency ICU supply",
            }
        ],
        org_id=1,
    )

    assert create_res["success"] is True
    req_data = create_res["data"]
    assert len(req_data["items"]) == 1
    req_item = req_data["items"][0]
    assert req_item["packaging_unit"] == "box"
    assert req_item["multiplier"] == 100
    assert req_item["quantity_requested"] == 2
    assert req_item["base_quantity_requested"] == 200  # 2 * 100 = 200 tablets

    # 4. Approve requisition -> verifies 200 base units are deducted from stock
    appr_res = req_service.approve_requisition(
        requisition_id=req_data["id"],
        approved_by="Dr. Chief",
        org_id=1,
    )
    assert appr_res["success"] is True

    # 5. Verify remaining closing stock is 300 tablets (500 - 200)
    latest_tx = db.query(InventoryTransaction).filter(
        InventoryTransaction.location_id == loc.id,
        InventoryTransaction.item_id == item.id,
    ).order_by(InventoryTransaction.id.desc()).first()

    assert latest_tx.closing_stock == 300
    assert latest_tx.issued == 200
    assert latest_tx.transacted_unit == "box"
    assert latest_tx.transacted_qty == 2
    assert latest_tx.multiplier == 100
