"""add_performance_indexes

Revision ID: 5c83d120f567
Revises: 4b92c011e345
Create Date: 2026-08-14 01:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c83d120f567'
down_revision: Union[str, None] = '4b92c011e345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. inventory_transactions composite & foreign key indexes
    op.create_index('ix_inventory_transactions_location_id', 'inventory_transactions', ['location_id'], unique=False)
    op.create_index('ix_inventory_transactions_item_id', 'inventory_transactions', ['item_id'], unique=False)
    op.create_index('ix_inventory_transactions_date', 'inventory_transactions', ['date'], unique=False)
    op.create_index('ix_inv_tx_loc_item_date', 'inventory_transactions', ['location_id', 'item_id', 'date'], unique=False)
    op.create_index('ix_inv_tx_item_date', 'inventory_transactions', ['item_id', 'date'], unique=False)

    # 2. requisitions & requisition_items indexes
    op.create_index('ix_requisitions_location_id', 'requisitions', ['location_id'], unique=False)
    op.create_index('ix_requisitions_status', 'requisitions', ['status'], unique=False)
    op.create_index('ix_requisitions_urgency', 'requisitions', ['urgency'], unique=False)
    op.create_index('ix_requisitions_created_at', 'requisitions', ['created_at'], unique=False)
    op.create_index('ix_requisitions_status_urgency', 'requisitions', ['status', 'urgency'], unique=False)
    op.create_index('ix_requisitions_loc_created', 'requisitions', ['location_id', 'created_at'], unique=False)
    op.create_index('ix_requisition_items_requisition_id', 'requisition_items', ['requisition_id'], unique=False)
    op.create_index('ix_requisition_items_item_id', 'requisition_items', ['item_id'], unique=False)
    op.create_index('ix_req_items_req_item', 'requisition_items', ['requisition_id', 'item_id'], unique=False)

    # 3. items & locations lookup indexes
    op.create_index('ix_items_name', 'items', ['name'], unique=False)
    op.create_index('ix_items_category', 'items', ['category'], unique=False)
    op.create_index('ix_items_name_category', 'items', ['name', 'category'], unique=False)
    op.create_index('ix_locations_name', 'locations', ['name'], unique=False)
    op.create_index('ix_locations_type', 'locations', ['type'], unique=False)
    op.create_index('ix_locations_region', 'locations', ['region'], unique=False)

    # 4. users role and active composite index
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_is_active', 'users', ['is_active'], unique=False)
    op.create_index('ix_users_role_active', 'users', ['role', 'is_active'], unique=False)

    # 5. chat_messages session ordering index
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'], unique=False)
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'], unique=False)
    op.create_index('ix_chat_messages_session_created', 'chat_messages', ['session_id', 'created_at'], unique=False)

    # 6. audit_logs and vendor_uploads indexes
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_resource_type', 'audit_logs', ['resource_type'], unique=False)
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)
    op.create_index('ix_audit_logs_action_created', 'audit_logs', ['action', 'created_at'], unique=False)
    op.create_index('ix_vendor_uploads_vendor_user_id', 'vendor_uploads', ['vendor_user_id'], unique=False)
    op.create_index('ix_vendor_uploads_location_id', 'vendor_uploads', ['location_id'], unique=False)
    op.create_index('ix_vendor_uploads_status', 'vendor_uploads', ['status'], unique=False)
    op.create_index('ix_vendor_uploads_uploaded_at', 'vendor_uploads', ['uploaded_at'], unique=False)


def downgrade() -> None:
    # Drop in reverse order
    op.drop_index('ix_vendor_uploads_uploaded_at', table_name='vendor_uploads')
    op.drop_index('ix_vendor_uploads_status', table_name='vendor_uploads')
    op.drop_index('ix_vendor_uploads_location_id', table_name='vendor_uploads')
    op.drop_index('ix_vendor_uploads_vendor_user_id', table_name='vendor_uploads')
    op.drop_index('ix_audit_logs_action_created', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_resource_type', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')

    op.drop_index('ix_chat_messages_session_created', table_name='chat_messages')
    op.drop_index('ix_chat_messages_created_at', table_name='chat_messages')
    op.drop_index('ix_chat_messages_session_id', table_name='chat_messages')

    op.drop_index('ix_users_role_active', table_name='users')
    op.drop_index('ix_users_is_active', table_name='users')
    op.drop_index('ix_users_role', table_name='users')

    op.drop_index('ix_locations_region', table_name='locations')
    op.drop_index('ix_locations_type', table_name='locations')
    op.drop_index('ix_locations_name', table_name='locations')
    op.drop_index('ix_items_name_category', table_name='items')
    op.drop_index('ix_items_category', table_name='items')
    op.drop_index('ix_items_name', table_name='items')

    op.drop_index('ix_req_items_req_item', table_name='requisition_items')
    op.drop_index('ix_requisition_items_item_id', table_name='requisition_items')
    op.drop_index('ix_requisition_items_requisition_id', table_name='requisition_items')
    op.drop_index('ix_requisitions_loc_created', table_name='requisitions')
    op.drop_index('ix_requisitions_status_urgency', table_name='requisitions')
    op.drop_index('ix_requisitions_created_at', table_name='requisitions')
    op.drop_index('ix_requisitions_urgency', table_name='requisitions')
    op.drop_index('ix_requisitions_status', table_name='requisitions')
    op.drop_index('ix_requisitions_location_id', table_name='requisitions')

    op.drop_index('ix_inv_tx_item_date', table_name='inventory_transactions')
    op.drop_index('ix_inv_tx_loc_item_date', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_date', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_item_id', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_location_id', table_name='inventory_transactions')
