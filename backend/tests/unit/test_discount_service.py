import pytest
from app.application.discount_service import apply_discount, validate_discount_config


def test_apply_discount_none_model():
    res = apply_discount(500.0, {"discount_model": "none"})
    assert res["gross_total"] == 500.0
    assert res["discount_model"] == "none"
    assert res["discount_pct"] == 0.0
    assert res["discount_amount"] == 0.0
    assert res["net_total"] == 500.0


def test_apply_discount_empty_config():
    res = apply_discount(250.0, None)
    assert res["discount_model"] == "none"
    assert res["discount_amount"] == 0.0
    assert res["net_total"] == 250.0


def test_apply_discount_flat_percentage():
    config = {"discount_model": "flat", "flat_discount_pct": 10.0}
    res = apply_discount(450.0, config)
    assert res["gross_total"] == 450.0
    assert res["discount_model"] == "flat"
    assert res["discount_pct"] == 10.0
    assert res["discount_amount"] == 45.0
    assert res["net_total"] == 405.0


def test_apply_discount_flat_rounding():
    config = {"discount_model": "flat", "flat_discount_pct": 12.5}
    res = apply_discount(333.33, config)
    assert res["discount_pct"] == 12.5
    assert res["discount_amount"] == round(333.33 * 0.125, 2)
    assert res["net_total"] == round(333.33 - res["discount_amount"], 2)


def test_apply_discount_tiered_slabs():
    config = {
        "discount_model": "tiered",
        "tiered_discount_config": [
            {"min_bill": 0, "max_bill": 499, "discount_pct": 0},
            {"min_bill": 500, "max_bill": 1999, "discount_pct": 5},
            {"min_bill": 2000, "max_bill": 9999, "discount_pct": 10},
            {"min_bill": 10000, "max_bill": None, "discount_pct": 15},
        ],
    }

    # Slab 1: 0 - 499 -> 0%
    r1 = apply_discount(250.0, config)
    assert r1["discount_pct"] == 0.0
    assert r1["discount_amount"] == 0.0
    assert r1["net_total"] == 250.0

    # Slab 2: 500 - 1999 -> 5%
    r2 = apply_discount(1000.0, config)
    assert r2["discount_pct"] == 5.0
    assert r2["discount_amount"] == 50.0
    assert r2["net_total"] == 950.0

    # Slab 3: 2000 - 9999 -> 10%
    r3 = apply_discount(3000.0, config)
    assert r3["discount_pct"] == 10.0
    assert r3["discount_amount"] == 300.0
    assert r3["net_total"] == 2700.0

    # Slab 4: 10000+ -> 15%
    r4 = apply_discount(12000.0, config)
    assert r4["discount_pct"] == 15.0
    assert r4["discount_amount"] == 1800.0
    assert r4["net_total"] == 10200.0


def test_validate_discount_config_valid():
    assert validate_discount_config({"discount_model": "none"}) == []
    assert validate_discount_config({"discount_model": "flat", "flat_discount_pct": 10}) == []
    assert validate_discount_config({
        "discount_model": "tiered",
        "tiered_discount_config": [
            {"min_bill": 0, "max_bill": 500, "discount_pct": 0},
            {"min_bill": 500, "max_bill": None, "discount_pct": 10},
        ],
    }) == []


def test_validate_discount_config_invalid():
    # Invalid model
    errs = validate_discount_config({"discount_model": "invalid_model"})
    assert any("discount_model must be one of" in e for e in errs)

    # Missing flat pct
    errs = validate_discount_config({"discount_model": "flat"})
    assert any("flat_discount_pct is required" in e for e in errs)

    # Negative flat pct
    errs = validate_discount_config({"discount_model": "flat", "flat_discount_pct": -5})
    assert any("flat_discount_pct must be between" in e for e in errs)

    # Empty tiered slabs
    errs = validate_discount_config({"discount_model": "tiered", "tiered_discount_config": []})
    assert any("must be a non-empty list" in e for e in errs)

    # Invalid max_bill <= min_bill
    errs = validate_discount_config({
        "discount_model": "tiered",
        "tiered_discount_config": [{"min_bill": 500, "max_bill": 200, "discount_pct": 5}],
    })
    assert any("must be greater than 'min_bill'" in e for e in errs)
