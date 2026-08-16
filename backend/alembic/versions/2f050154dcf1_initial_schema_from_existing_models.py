"""initial schema from existing models

Revision ID: 2f050154dcf1
Revises: 
Create Date: 2026-07-24 17:52:28.811189

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f050154dcf1'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL with IF EXISTS / IF NOT EXISTS guards —
    # these indexes may or may not exist depending on the DB instance history.
    op.execute("DROP INDEX IF EXISTS ix_inv_tx_batch")
    op.execute("DROP INDEX IF EXISTS ix_inv_tx_expiry")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_inventory_transactions_batch_number "
        "ON inventory_transactions (batch_number)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_inventory_transactions_expiry_date "
        "ON inventory_transactions (expiry_date)"
    )
    op.alter_column('items', 'storage_temp',
               existing_type=sa.VARCHAR(length=20),
               server_default=None,
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('items', 'storage_temp',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'ambient'::character varying"),
               existing_nullable=False)
    op.execute("DROP INDEX IF EXISTS ix_inventory_transactions_expiry_date")
    op.execute("DROP INDEX IF EXISTS ix_inventory_transactions_batch_number")
    op.execute("CREATE INDEX IF NOT EXISTS ix_inv_tx_expiry ON inventory_transactions (expiry_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_inv_tx_batch ON inventory_transactions (batch_number)")
