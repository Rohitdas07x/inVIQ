"""
Invoice Repository — Infrastructure / Database Layer
===================================================
Handles all CRUD operations for VendorInvoice records.
"""

import logging
from datetime import date, datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.infrastructure.database.models import VendorInvoice, VendorUpload, User, Location

logger = logging.getLogger("smart_inventory.invoice_repo")


class InvoiceRepository:
    """Repository for VendorInvoice queries and creation."""

    def __init__(self, db: Session):
        self.db = db

    def generate_next_invoice_number(self, invoice_date: Optional[date] = None) -> str:
        """
        Generate sequential invoice number: INV-YYYYMMDD-001, INV-YYYYMMDD-002, etc.
        """
        if invoice_date is None:
            invoice_date = date.today()

        date_prefix = invoice_date.strftime("%Y%m%d")
        search_pattern = f"INV-{date_prefix}-%"

        # Count existing invoices for today
        count = (
            self.db.query(func.count(VendorInvoice.id))
            .filter(VendorInvoice.invoice_number.like(search_pattern))
            .scalar()
            or 0
        )

        sequence = count + 1
        return f"INV-{date_prefix}-{sequence:03d}"

    def create(
        self,
        vendor_user_id: int,
        vendor_upload_id: int,
        invoice_number: str,
        invoice_date: date,
        line_items: List[Dict[str, Any]],
        subtotal: float,
        tax_amount: float,
        total_amount: float,
        org_id: Optional[int] = None,
        status: str = "ISSUED",
        pdf_path: Optional[str] = None,
        pdf_url: Optional[str] = None,
        pdf_content: Optional[bytes] = None,
    ) -> VendorInvoice:
        """Create and persist a new VendorInvoice."""
        invoice = VendorInvoice(
            org_id=org_id,
            vendor_user_id=vendor_user_id,
            vendor_upload_id=vendor_upload_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            line_items=line_items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status=status,
            pdf_path=pdf_path,
            pdf_url=pdf_url,
            pdf_content=pdf_content,
        )
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def get_by_id(self, invoice_id: int) -> Optional[VendorInvoice]:
        """Fetch invoice by primary key."""
        return self.db.query(VendorInvoice).filter(VendorInvoice.id == invoice_id).first()

    def get_by_number(self, invoice_number: str) -> Optional[VendorInvoice]:
        """Fetch invoice by unique invoice number."""
        return self.db.query(VendorInvoice).filter(VendorInvoice.invoice_number == invoice_number).first()

    def get_by_upload_id(self, upload_id: int) -> Optional[VendorInvoice]:
        """Fetch invoice associated with a vendor upload."""
        return self.db.query(VendorInvoice).filter(VendorInvoice.vendor_upload_id == upload_id).first()

    def list_invoices(
        self,
        org_id: Optional[int] = None,
        vendor_user_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[VendorInvoice], int]:
        """List invoices with pagination and optional filtering."""
        query = self.db.query(VendorInvoice)

        if org_id is not None:
            query = query.filter(VendorInvoice.org_id == org_id)

        if vendor_user_id is not None:
            query = query.filter(VendorInvoice.vendor_user_id == vendor_user_id)

        if status:
            query = query.filter(VendorInvoice.status == status)

        total = query.count()
        invoices = (
            query.order_by(VendorInvoice.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return invoices, total
