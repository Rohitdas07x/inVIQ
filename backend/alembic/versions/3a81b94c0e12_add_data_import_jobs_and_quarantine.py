"""add data_import_jobs and import_quarantine_rows tables

Revision ID: 3a81b94c0e12
Revises: 2f050154dcf1
Create Date: 2026-08-11 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a81b94c0e12'
down_revision: Union[str, None] = '2f050154dcf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'data_import_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_user_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('target_entity', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('total_rows', sa.Integer(), nullable=True),
        sa.Column('success_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('quarantined_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('mapping_result', sa.JSON(), nullable=True),
        sa.Column('mapping_cache_hit', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('file_content', sa.LargeBinary(), nullable=True),
        sa.Column('is_background', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_import_jobs_id'), 'data_import_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_data_import_jobs_org_id'), 'data_import_jobs', ['org_id'], unique=False)
    op.create_index(op.f('ix_data_import_jobs_status'), 'data_import_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_data_import_jobs_uploaded_by_user_id'), 'data_import_jobs', ['uploaded_by_user_id'], unique=False)

    op.create_table(
        'import_quarantine_rows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('row_number', sa.Integer(), nullable=False),
        sa.Column('raw_data', sa.JSON(), nullable=False),
        sa.Column('reason', sa.String(length=30), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['data_import_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_quarantine_rows_id'), 'import_quarantine_rows', ['id'], unique=False)
    op.create_index(op.f('ix_import_quarantine_rows_job_id'), 'import_quarantine_rows', ['job_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_import_quarantine_rows_job_id'), table_name='import_quarantine_rows')
    op.drop_index(op.f('ix_import_quarantine_rows_id'), table_name='import_quarantine_rows')
    op.drop_table('import_quarantine_rows')

    op.drop_index(op.f('ix_data_import_jobs_uploaded_by_user_id'), table_name='data_import_jobs')
    op.drop_index(op.f('ix_data_import_jobs_status'), table_name='data_import_jobs')
    op.drop_index(op.f('ix_data_import_jobs_org_id'), table_name='data_import_jobs')
    op.drop_index(op.f('ix_data_import_jobs_id'), table_name='data_import_jobs')
    op.drop_table('data_import_jobs')
