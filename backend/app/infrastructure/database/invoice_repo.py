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
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.infrastructure.database.models import VendorInvoice, VendorUpload, User, Location
from app.core.exceptions import DatabaseError, DuplicateError, ValidationError

logger = logging.getLogger("smart_inventory.invoice_repo")


class InvoiceRepository:
    """Repository for VendorInvoice queries and creation."""

    def __init__(self, db: Session):
        self.db = db

    def generate_next_invoice_number(self, invoice_date: Optional[date] = None) -> str:
        """
        Generate sequential invoice number: INV-YYYYMMDD-001, INV-YYYYMMDD-002, etc.
        Uses max existing sequence for the date to avoid duplicate counts.
        """
        if invoice_date is None:
            invoice_date = date.today()

        date_prefix = invoice_date.strftime("%Y%m%d")
        prefix = f"INV-{date_prefix}-"

        # Query the highest existing invoice number for today
        latest = (
            self.db.query(VendorInvoice.invoice_number)
            .filter(VendorInvoice.invoice_number.like(f"{prefix}%"))
            .order_by(VendorInvoice.invoice_number.desc())
            .first()
        )

        if latest and latest[0]:
            try:
                seq_part = str(latest[0]).split("-")[-1]
                sequence = int(seq_part) + 1
            except (ValueError, IndexError):
                count = (
                    self.db.query(func.count(VendorInvoice.id))
                    .filter(VendorInvoice.invoice_number.like(f"{prefix}%"))
                    .scalar()
                    or 0
                )
                sequence = count + 1
        else:
            sequence = 1

        return f"{prefix}{sequence:03d}"

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
        max_retries: int = 5,
    ) -> VendorInvoice:
        """Create and persist a new VendorInvoice with automatic retry on collision."""
        if org_id is None:
            raise ValidationError("Organization ID (org_id) is required for vendor invoices")
        current_invoice_num = invoice_number
        for attempt in range(max_retries):
            try:
                invoice = VendorInvoice(
                    org_id=org_id,
                    vendor_user_id=vendor_user_id,
                    vendor_upload_id=vendor_upload_id,
                    invoice_number=current_invoice_num,
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
            except IntegrityError as err:
                self.db.rollback()
                if attempt == max_retries - 1:
                    logger.error("Failed to create invoice after %d retries: %s", max_retries, err)
                    raise DuplicateError(f"Duplicate invoice number '{current_invoice_num}'")
                logger.warning(
                    "Invoice number collision for %s (attempt %d/%d), regenerating...",
                    current_invoice_num, attempt + 1, max_retries,
                )
                current_invoice_num = self.generate_next_invoice_number(invoice_date)
            except SQLAlchemyError as e:
                self.db.rollback()
                logger.error("Database error creating invoice: %s", str(e))
                raise DatabaseError(f"Failed to create invoice: {str(e)}")

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
