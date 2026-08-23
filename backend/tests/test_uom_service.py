import pytest
from app.application.uom_service import (
    convert_to_base_qty,
    convert_from_base_qty,
    resolve_item_packaging,
    decompose_stock,
    validate_packaging_list,
)


class MockPackaging:
    def __init__(self, id, unit_name, multiplier, barcode=None, mrp=None, purchase_rate=None, is_default_dispense=False, is_default_purchase=False):
        self.id = id
        self.unit_name = unit_name
        self.multiplier = multiplier
        self.barcode = barcode
        self.mrp = mrp
        self.purchase_rate = purchase_rate
        self.is_default_dispense = is_default_dispense
        self.is_default_purchase = is_default_purchase


class MockItem:
    def __init__(self, id=1, name="Paracetamol 500mg", unit="tablet", mrp=5.0, purchase_rate=3.0, packagings=None):
        self.id = id
        self.name = name
        self.unit = unit
        self.mrp = mrp
        self.purchase_rate = purchase_rate
        self.packagings = packagings or []


def test_convert_to_base_qty():
    # 2 boxes of 100 tablets -> 200
    assert convert_to_base_qty(2, 100) == 200
    # 5 strips of 10 tablets -> 50
    assert convert_to_base_qty(5, 10) == 50
    # 3 loose tablets (multiplier 1) -> 3
    assert convert_to_base_qty(3, 1) == 3
    # Default fallback
    assert convert_to_base_qty(4, None) == 4


def test_convert_from_base_qty():
    assert convert_from_base_qty(250, 10) == 25.0
    assert convert_from_base_qty(1000, 100) == 10.0
    assert convert_from_base_qty(7, 10) == 0.7


def test_resolve_item_packaging_by_barcode():
    strip_pkg = MockPackaging(1, "strip", 10, barcode="8901111111111", mrp=45.0)
    box_pkg = MockPackaging(2, "box", 100, barcode="8902222222222", mrp=420.0)
    item = MockItem(packagings=[strip_pkg, box_pkg])

    # Scan strip barcode
    res = resolve_item_packaging(item, "8901111111111")
    assert res["unit_name"] == "strip"
    assert res["multiplier"] == 10
    assert res["mrp"] == 45.0
    assert res["packaging_id"] == 1

    # Scan box barcode
    res_box = resolve_item_packaging(item, "8902222222222")
    assert res_box["unit_name"] == "box"
    assert res_box["multiplier"] == 100
    assert res_box["mrp"] == 420.0


def test_resolve_item_packaging_by_unit_name():
    strip_pkg = MockPackaging(1, "strip", 10, mrp=50.0)
    item = MockItem(packagings=[strip_pkg])

    res = resolve_item_packaging(item, "strip")
    assert res["unit_name"] == "strip"
    assert res["multiplier"] == 10
    assert res["mrp"] == 50.0

    # Fallback to base unit if unknown
    res_base = resolve_item_packaging(item, "tablet")
    assert res_base["unit_name"] == "tablet"
    assert res_base["multiplier"] == 1
    assert res_base["mrp"] == 5.0


def test_single_tablet_strip_handling():
    """Test 1-tablet strips (e.g. Fluconazole 150mg or I-Pill single dose) where multiplier = 1."""
    single_strip = MockPackaging(1, "strip", 1, barcode="8909999999999", mrp=35.0, is_default_dispense=True)
    item = MockItem(name="Fluconazole 150mg", unit="tablet", mrp=35.0, packagings=[single_strip])

    res = resolve_item_packaging(item, "8909999999999")
    assert res["unit_name"] == "strip"
    assert res["multiplier"] == 1
    assert res["mrp"] == 35.0
    assert convert_to_base_qty(2, res["multiplier"]) == 2


def test_decompose_stock_hierarchy():
    strip_pkg = MockPackaging(1, "strip", 10)
    box_pkg = MockPackaging(2, "box", 100)
    packagings = [strip_pkg, box_pkg]

    # 977 tablets -> 9 boxes, 7 strips, 7 tablets
    res = decompose_stock(977, "tablet", packagings)
    assert res["base_stock"] == 977
    assert res["base_unit"] == "tablet"
    assert "9 boxes" in res["display_string"]
    assert "7 strips" in res["display_string"]
    assert "7 tablets" in res["display_string"]

    # Exactly 200 tablets -> 2 boxes
    res2 = decompose_stock(200, "tablet", packagings)
    assert res2["display_string"] == "2 boxes"


def test_validate_packaging_list():
    valid = [
        {"unit_name": "strip", "multiplier": 10, "mrp": 50.0},
        {"unit_name": "box", "multiplier": 100, "mrp": 450.0},
    ]
    assert validate_packaging_list(valid, "tablet") == []

    invalid = [
        {"unit_name": "", "multiplier": 0},
        {"unit_name": "tablet", "multiplier": 1},  # duplicate of base_unit
    ]
    errors = validate_packaging_list(invalid, "tablet")
    assert len(errors) >= 2
