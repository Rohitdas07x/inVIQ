"""enums_indexes_varchar_fixes

Revision ID: 73a536e2e770
Revises: 5c83d120f567
Create Date: 2026-08-16 13:59:04.239599

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73a536e2e770'
down_revision: Union[str, None] = '5c83d120f567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure Postgres enum types exist
    op.execute("""
    DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'vendor');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE org_plan AS ENUM ('single_pharmacy', 'multi_pharmacy');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    # 2. Alter column types with explicit USING clauses for Postgres
    op.execute("""
    ALTER TABLE users 
        ALTER COLUMN role DROP DEFAULT,
        ALTER COLUMN role TYPE user_role USING (
            CASE 
                WHEN role IN ('super_admin', 'admin', 'staff', 'vendor') THEN role::user_role
                ELSE 'staff'::user_role
            END
        ),
        ALTER COLUMN role SET DEFAULT 'staff'::user_role;
    """)

    op.execute("""
    ALTER TABLE organizations 
        ALTER COLUMN plan DROP DEFAULT,
        ALTER COLUMN plan TYPE org_plan USING (
            CASE 
                WHEN plan IN ('single_pharmacy', 'multi_pharmacy') THEN plan::org_plan
                ELSE 'single_pharmacy'::org_plan
            END
        ),
        ALTER COLUMN plan SET DEFAULT 'single_pharmacy'::org_plan;
    """)

    # 3. Alter VARCHAR lengths & types
    op.alter_column('chat_sessions', 'id',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=36),
               existing_nullable=False)
    op.alter_column('items', 'barcode',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=50),
               existing_nullable=True)
    op.alter_column('vendor_invoices', 'pdf_url',
               existing_type=sa.VARCHAR(length=1000),
               type_=sa.Text(),
               existing_nullable=True)

    # 4. Create missing performance & multi-tenant composite indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_org_role ON users (org_id, role)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_items_org_category ON items (org_id, category)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_requisitions_loc_status ON requisitions (location_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_org_created ON audit_logs (org_id, created_at)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_org_created")
    op.execute("DROP INDEX IF EXISTS ix_requisitions_loc_status")
    op.execute("DROP INDEX IF EXISTS ix_items_org_category")
    op.execute("DROP INDEX IF EXISTS ix_users_org_role")

    op.alter_column('vendor_invoices', 'pdf_url',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=1000),
               existing_nullable=True)
    op.alter_column('items', 'barcode',
               existing_type=sa.String(length=50),
               type_=sa.VARCHAR(length=100),
               existing_nullable=True)
    op.alter_column('chat_sessions', 'id',
               existing_type=sa.String(length=36),
               type_=sa.VARCHAR(length=100),
               existing_nullable=False)

    op.execute("ALTER TABLE organizations ALTER COLUMN plan TYPE VARCHAR(50) USING plan::text")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    op.execute("DROP TYPE IF EXISTS org_plan")
    op.execute("DROP TYPE IF EXISTS user_role")
