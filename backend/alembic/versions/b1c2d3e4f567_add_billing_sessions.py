"""add_billing_sessions

Revision ID: b1c2d3e4f567
Revises: a76ebf7376cf
Create Date: 2026-08-22 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f567'
down_revision: Union[str, None] = 'a76ebf7376cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'billing_sessions',
        sa.Column('id',             sa.Integer(),    nullable=False),
        sa.Column('org_id',         sa.Integer(),    nullable=False),
        sa.Column('location_id',    sa.Integer(),    nullable=False),
        sa.Column('cashier_id',     sa.Integer(),    nullable=False),
        sa.Column('status',         sa.String(20),   nullable=False, server_default='OPEN'),
        sa.Column('items',          sa.JSON(),       nullable=False, server_default='[]'),
        sa.Column('gross_total',    sa.Float(),      nullable=True),
        sa.Column('discount_model', sa.String(20),   nullable=True),
        sa.Column('discount_pct',   sa.Float(),      nullable=True, server_default='0'),
        sa.Column('discount_amount',sa.Float(),      nullable=True, server_default='0'),
        sa.Column('net_total',      sa.Float(),      nullable=True),
        sa.Column('purchase_cost',  sa.Float(),      nullable=True),
        sa.Column('opened_at',  sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()),
        sa.Column('closed_at',  sa.TIMESTAMP(), nullable=True),
        sa.Column('month_key',  sa.String(7),   nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['org_id'],      ['organizations.id']),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id']),
        sa.ForeignKeyConstraint(['cashier_id'],  ['users.id']),
    )
    op.create_index(op.f('ix_billing_sessions_id'),          'billing_sessions', ['id'],         unique=False)
    op.create_index(op.f('ix_billing_sessions_org_id'),      'billing_sessions', ['org_id'],     unique=False)
    op.create_index(op.f('ix_billing_sessions_location_id'), 'billing_sessions', ['location_id'],unique=False)
    op.create_index(op.f('ix_billing_sessions_cashier_id'),  'billing_sessions', ['cashier_id'], unique=False)
    op.create_index('ix_billing_sessions_org_status',        'billing_sessions', ['org_id', 'status'],      unique=False)
    op.create_index('ix_billing_sessions_org_month',         'billing_sessions', ['org_id', 'month_key'],   unique=False)
    op.create_index('ix_billing_sessions_location_opened',   'billing_sessions', ['location_id', 'opened_at'], unique=False)
    op.create_index('ix_billing_sessions_cashier_opened',    'billing_sessions', ['cashier_id', 'opened_at'],  unique=False)


def downgrade() -> None:
    op.drop_index('ix_billing_sessions_cashier_opened',  table_name='billing_sessions')
    op.drop_index('ix_billing_sessions_location_opened', table_name='billing_sessions')
    op.drop_index('ix_billing_sessions_org_month',       table_name='billing_sessions')
    op.drop_index('ix_billing_sessions_org_status',      table_name='billing_sessions')
    op.drop_index(op.f('ix_billing_sessions_cashier_id'),  table_name='billing_sessions')
    op.drop_index(op.f('ix_billing_sessions_location_id'), table_name='billing_sessions')
    op.drop_index(op.f('ix_billing_sessions_org_id'),      table_name='billing_sessions')
    op.drop_index(op.f('ix_billing_sessions_id'),          table_name='billing_sessions')
    op.drop_table('billing_sessions')
