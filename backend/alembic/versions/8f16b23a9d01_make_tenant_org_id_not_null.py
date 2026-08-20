"""make_tenant_org_id_not_null

Revision ID: 8f16b23a9d01
Revises: 73a536e2e770
Create Date: 2026-08-19 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f16b23a9d01'
down_revision: Union[str, None] = '73a536e2e770'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Multi-Tenant Safety Check: Never blindly assign unassociated/orphan records to Org 1.
    # If any records without an organization exist, halt the migration to prevent cross-tenant data leakage.
    conn = op.get_bind()
    tables = ['locations', 'items', 'vendor_uploads', 'vendor_invoices', 'data_import_jobs']
    for table in tables:
        count = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table} WHERE org_id IS NULL")).scalar()
        if count and count > 0:
            raise RuntimeError(
                f"Multi-tenant migration halted: table '{table}' contains {count} orphan record(s) with NULL org_id. "
                "Do not assign them blindly to Organization 1. Explicitly assign or quarantine these records with their proper organization owner before migrating."
            )

    # 2. Enforce NOT NULL constraints on core tenant-owned entities
    op.alter_column('locations', 'org_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('items', 'org_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('vendor_uploads', 'org_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('vendor_invoices', 'org_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('data_import_jobs', 'org_id', existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column('data_import_jobs', 'org_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('vendor_invoices', 'org_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('vendor_uploads', 'org_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('items', 'org_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('locations', 'org_id', existing_type=sa.Integer(), nullable=True)
