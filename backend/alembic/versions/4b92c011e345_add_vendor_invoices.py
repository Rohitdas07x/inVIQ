"""add vendor_invoices table
Revision ID: 4b92c011e345
Revises: 3a81b94c0e12
Create Date: 2026-08-14 00:54:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b92c011e345'
down_revision: Union[str, None] = '3a81b94c0e12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vendor_invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('vendor_user_id', sa.Integer(), nullable=False),
        sa.Column('vendor_upload_id', sa.Integer(), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('line_items', sa.JSON(), nullable=False),
        sa.Column('subtotal', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('tax_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ISSUED'),
        sa.Column('pdf_path', sa.String(length=500), nullable=True),
        sa.Column('pdf_url', sa.String(length=1000), nullable=True),
        sa.Column('pdf_content', sa.LargeBinary(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['vendor_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['vendor_upload_id'], ['vendor_uploads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_number')
    )
    op.create_index(op.f('ix_vendor_invoices_id'), 'vendor_invoices', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_invoices_org_id'), 'vendor_invoices', ['org_id'], unique=False)
    op.create_index(op.f('ix_vendor_invoices_vendor_user_id'), 'vendor_invoices', ['vendor_user_id'], unique=False)
    op.create_index(op.f('ix_vendor_invoices_vendor_upload_id'), 'vendor_invoices', ['vendor_upload_id'], unique=False)
    op.create_index(op.f('ix_vendor_invoices_invoice_number'), 'vendor_invoices', ['invoice_number'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_vendor_invoices_invoice_number'), table_name='vendor_invoices')
    op.drop_index(op.f('ix_vendor_invoices_vendor_upload_id'), table_name='vendor_invoices')
    op.drop_index(op.f('ix_vendor_invoices_vendor_user_id'), table_name='vendor_invoices')
    op.drop_index(op.f('ix_vendor_invoices_org_id'), table_name='vendor_invoices')
    op.drop_index(op.f('ix_vendor_invoices_id'), table_name='vendor_invoices')
    op.drop_table('vendor_invoices')
