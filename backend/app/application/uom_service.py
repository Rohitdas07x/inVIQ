"""
UOM & Packaging Hierarchy Service — Application Layer

Stateless domain math and conversion helper for multi-tier Units of Measure.

Key Principles:
  1. Internal inventory ledgers ALWAYS store integer counts in the atomic base unit
     (e.g., tablet, capsule, ml, vial, piece).
  2. Multipliers define how many base units are contained in 1 packaging unit
     (e.g., 1 strip = 10 tablets -> multiplier = 10; 1 box = 100 tablets -> multiplier = 100).
  3. Single-dose packaging (e.g., 1-tablet strips like Fluconazole 150mg or I-Pill)
     have multiplier = 1 and are fully supported.
"""

from typing import Any, Dict, List, Optional, Tuple


def convert_to_base_qty(quantity: int, multiplier: int = 1) -> int:
    """
    Convert a packaged quantity into base units.
    Example: 2 boxes (multiplier 100) -> 200 base units.
    """
    mult = max(1, int(multiplier or 1))
    return int(quantity) * mult


def convert_from_base_qty(base_quantity: int, multiplier: int = 1) -> float:
    """
    Convert base units back into a packaged quantity (floating-point).
    Example: 250 tablets with strip multiplier 10 -> 25.0 strips.
    """
    mult = max(1, int(multiplier or 1))
    return round(int(base_quantity) / float(mult), 2)


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


def _safe_int(val: Any, default: int = 1) -> int:
    try:
        if val is None:
            return default
        return int(val)
    except (TypeError, ValueError):
        return default


def resolve_item_packaging(
    item: Any,
    unit_name_or_barcode: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Resolve the applicable packaging tier for an item.

    Matches by:
      1. Specific packaging barcode (EAN-13 printed on strip/box)
      2. Specific packaging unit name (case-insensitive, e.g. "strip", "box")
      3. Item default dispense packaging (if flagged is_default_dispense)
      4. Fallback to Item base unit (multiplier = 1)

    Returns:
      {
        "unit_name": str,
        "multiplier": int,
        "mrp": float,
        "purchase_rate": float,
        "is_base_unit": bool,
        "packaging_id": Optional[int]
      }
    """
    base_unit = str(getattr(item, "unit", "units") or "units")
    base_mrp = _safe_float(getattr(item, "mrp", 0.0), 0.0)
    base_purchase_rate = _safe_float(getattr(item, "purchase_rate", 0.0), 0.0)

    raw_packagings = getattr(item, "packagings", None)
    packagings = raw_packagings if isinstance(raw_packagings, (list, tuple, set)) else []

    # 1. Match by packaging barcode or unit name
    if unit_name_or_barcode:
        query_str = str(unit_name_or_barcode).strip().lower()

        # Check by barcode first
        for pkg in packagings:
            pkg_barcode = str(getattr(pkg, "barcode", "") or "").strip().lower()
            if pkg_barcode and pkg_barcode == query_str:
                mult = max(1, _safe_int(getattr(pkg, "multiplier", 1), 1))
                pkg_mrp = _safe_float(getattr(pkg, "mrp", None), round(base_mrp * mult, 2))
                pkg_pr = _safe_float(getattr(pkg, "purchase_rate", None), round(base_purchase_rate * mult, 2))
                return {
                    "unit_name": str(getattr(pkg, "unit_name", base_unit)),
                    "multiplier": mult,
                    "mrp": pkg_mrp,
                    "purchase_rate": pkg_pr,
                    "is_base_unit": (mult == 1 and str(getattr(pkg, "unit_name", "")).lower() == base_unit.lower()),
                    "packaging_id": getattr(pkg, "id", None),
                }

        # Check by unit_name
        for pkg in packagings:
            pkg_uname = str(getattr(pkg, "unit_name", "") or "").strip().lower()
            if pkg_uname == query_str:
                mult = max(1, _safe_int(getattr(pkg, "multiplier", 1), 1))
                pkg_mrp = _safe_float(getattr(pkg, "mrp", None), round(base_mrp * mult, 2))
                pkg_pr = _safe_float(getattr(pkg, "purchase_rate", None), round(base_purchase_rate * mult, 2))
                return {
                    "unit_name": str(getattr(pkg, "unit_name", base_unit)),
                    "multiplier": mult,
                    "mrp": pkg_mrp,
                    "purchase_rate": pkg_pr,
                    "is_base_unit": (mult == 1 and str(getattr(pkg, "unit_name", "")).lower() == base_unit.lower()),
                    "packaging_id": getattr(pkg, "id", None),
                }

    # 2. Check if item has a default dispense packaging
    for pkg in packagings:
        if getattr(pkg, "is_default_dispense", False) is True:
            mult = max(1, _safe_int(getattr(pkg, "multiplier", 1), 1))
            pkg_mrp = _safe_float(getattr(pkg, "mrp", None), round(base_mrp * mult, 2))
            pkg_pr = _safe_float(getattr(pkg, "purchase_rate", None), round(base_purchase_rate * mult, 2))
            return {
                "unit_name": str(getattr(pkg, "unit_name", base_unit)),
                "multiplier": mult,
                "mrp": pkg_mrp,
                "purchase_rate": pkg_pr,
                "is_base_unit": (mult == 1 and str(getattr(pkg, "unit_name", "")).lower() == base_unit.lower()),
                "packaging_id": getattr(pkg, "id", None),
            }

    # 3. Default fallback to base unit (multiplier = 1)
    return {
        "unit_name": base_unit,
        "multiplier": 1,
        "mrp": base_mrp,
        "purchase_rate": base_purchase_rate,
        "is_base_unit": True,
        "packaging_id": None,
    }


def decompose_stock(
    base_stock: int,
    base_unit: str,
    packagings: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Decompose a raw base unit count into a hierarchical packaging breakdown.

    Example:
      base_stock = 977, base_unit = "tablet"
      packagings = [ {unit_name: "box", multiplier: 100}, {unit_name: "strip", multiplier: 10} ]

      Decomposition:
        977 // 100 = 9 boxes (rem 77)
        77 // 10   = 7 strips (rem 7)
        7 loose tablets

      Display: "9 boxes, 7 strips, 7 tablets"
    """
    stock = max(0, int(base_stock or 0))
    base_name = str(base_unit or "units").strip()

    valid_pkgs = []
    if isinstance(packagings, (list, tuple, set)):
        for p in packagings:
            mult = _safe_int(getattr(p, "multiplier", 1), 1)
            name = str(getattr(p, "unit_name", "") or "").strip()
            # Only include packaging units with multiplier > 1 for hierarchical division
            if mult > 1 and name and name.lower() != base_name.lower():
                valid_pkgs.append((mult, name))

    # Sort descending by multiplier (largest packaging first)
    valid_pkgs.sort(key=lambda x: x[0], reverse=True)

    breakdown = []
    remaining = stock

    for mult, name in valid_pkgs:
        pack_count = remaining // mult
        if pack_count > 0:
            breakdown.append({"unit": name, "quantity": pack_count, "multiplier": mult})
            remaining %= mult

    # Remaining loose base units
    if remaining > 0 or not breakdown:
        breakdown.append({"unit": base_name, "quantity": remaining, "multiplier": 1})

    # Build human-readable display string
    def _pluralize(name: str, count: int) -> str:
        u = name.strip()
        if count <= 1 or u.endswith("s") or u.lower() in ("ml", "mg", "gm", "kg", "l", "iu"):
            return u
        if u.endswith(("x", "ch", "sh", "ss", "z")):
            return f"{u}es"
        return f"{u}s"

    parts = []
    for b in breakdown:
        if b["quantity"] > 0 or len(breakdown) == 1:
            u_str = _pluralize(b["unit"], b["quantity"])
            parts.append(f"{b['quantity']} {u_str}")

    display_string = ", ".join(parts) if parts else f"{stock} {base_name}"

    return {
        "base_stock": stock,
        "base_unit": base_name,
        "breakdown": breakdown,
        "display_string": display_string,
    }


def validate_packaging_list(packagings_data: List[Dict[str, Any]], base_unit: str) -> List[str]:
    """
    Validate a list of packaging configurations before database persistence.
    """
    errors = []
    if not isinstance(packagings_data, list):
        return ["Packagings must be a list of packaging objects"]

    seen_units = {base_unit.strip().lower()}
    for idx, p in enumerate(packagings_data):
        unit_name = str(p.get("unit_name", "")).strip()
        if not unit_name:
            errors.append(f"Packaging row #{idx + 1}: 'unit_name' is required")
            continue

        if unit_name.lower() in seen_units:
            errors.append(f"Packaging row #{idx + 1}: duplicate unit name '{unit_name}'")
        seen_units.add(unit_name.lower())

        mult = p.get("multiplier")
        try:
            mult_val = int(mult)
            if mult_val < 1:
                errors.append(f"Packaging '{unit_name}': multiplier must be an integer >= 1")
        except (TypeError, ValueError):
            errors.append(f"Packaging '{unit_name}': multiplier must be a valid integer")

        mrp = p.get("mrp")
        if mrp is not None:
            try:
                if float(mrp) < 0:
                    errors.append(f"Packaging '{unit_name}': MRP cannot be negative")
            except (TypeError, ValueError):
                errors.append(f"Packaging '{unit_name}': invalid MRP")

    return errors
