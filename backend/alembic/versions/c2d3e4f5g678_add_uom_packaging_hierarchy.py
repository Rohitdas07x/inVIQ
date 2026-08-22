"""add_uom_packaging_hierarchy

Revision ID: c2d3e4f5g678
Revises: b1c2d3e4f567
Create Date: 2026-08-22 13:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5g678'
down_revision: Union[str, None] = 'b1c2d3e4f567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create item_packagings table
    op.create_table(
        'item_packagings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('unit_name', sa.String(length=50), nullable=False),
        sa.Column('multiplier', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('barcode', sa.String(length=50), nullable=True),
        sa.Column('mrp', sa.Float(), nullable=True),
        sa.Column('purchase_rate', sa.Float(), nullable=True),
        sa.Column('is_default_dispense', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_default_purchase', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_item_packagings_item', 'item_packagings', ['item_id'], unique=False)
    op.create_index('ix_item_packagings_barcode_org', 'item_packagings', ['barcode', 'org_id'], unique=False)
    op.create_index('ix_item_packagings_org_unit', 'item_packagings', ['org_id', 'unit_name'], unique=False)
    op.create_index('ix_item_packagings_item_multiplier', 'item_packagings', ['item_id', 'multiplier'], unique=False)

    # 2. Add UOM metadata columns to inventory_transactions
    op.add_column('inventory_transactions', sa.Column('transacted_unit', sa.String(length=50), nullable=True))
    op.add_column('inventory_transactions', sa.Column('transacted_qty', sa.Integer(), nullable=True))
    op.add_column('inventory_transactions', sa.Column('multiplier', sa.Integer(), nullable=True, server_default='1'))

    # 3. Add UOM columns to requisition_items
    op.add_column('requisition_items', sa.Column('packaging_unit', sa.String(length=50), nullable=True))
    op.add_column('requisition_items', sa.Column('multiplier', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('requisition_items', sa.Column('base_quantity_requested', sa.Integer(), nullable=True))
    op.add_column('requisition_items', sa.Column('base_quantity_approved', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('requisition_items', 'base_quantity_approved')
    op.drop_column('requisition_items', 'base_quantity_requested')
    op.drop_column('requisition_items', 'multiplier')
    op.drop_column('requisition_items', 'packaging_unit')

    op.drop_column('inventory_transactions', 'multiplier')
    op.drop_column('inventory_transactions', 'transacted_qty')
    op.drop_column('inventory_transactions', 'transacted_unit')

    op.drop_index('ix_item_packagings_item_multiplier', table_name='item_packagings')
    op.drop_index('ix_item_packagings_org_unit', table_name='item_packagings')
    op.drop_index('ix_item_packagings_barcode_org', table_name='item_packagings')
    op.drop_index('ix_item_packagings_item', table_name='item_packagings')
    op.drop_table('item_packagings')
