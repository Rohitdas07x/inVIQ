"""
Pydantic Schemas for Vendor Invoices
====================================
Request and response models for VendorInvoice endpoints.
"""

from typing import List, Optional, Any, Dict
from datetime import date, datetime
from pydantic import BaseModel, Field


class InvoiceLineItem(BaseModel):
    item_id: Optional[int] = None
    item_name: str
    quantity: int = Field(gt=0)
    unit: str = "Units"
    unit_price: float = Field(ge=0.0)
    total: float = Field(ge=0.0)


class VendorInvoiceResponse(BaseModel):
    id: int
    org_id: Optional[int] = None
    vendor_user_id: int
    vendor_upload_id: int
    invoice_number: str
    invoice_date: str
    line_items: List[Dict[str, Any]]
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str
    pdf_path: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class VendorInvoiceListItem(BaseModel):
    id: int
    invoice_number: str
    invoice_date: str
    vendor_user_id: int
    vendor_name: Optional[str] = None
    items_count: int
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str
    pdf_url: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
