"""add_magic_link_tokens

Revision ID: cab607246d0d
Revises: 81ceb44427c3
Create Date: 2026-05-15 16:13:29.998449

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cab607246d0d'
down_revision: Union[str, None] = '81ceb44427c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('magic_link_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        schema='rolevault'
    )
    op.create_index(op.f('ix_rolevault_magic_link_tokens_email'), 'magic_link_tokens', ['email'], unique=False, schema='rolevault')
    op.create_index(op.f('ix_rolevault_magic_link_tokens_token'), 'magic_link_tokens', ['token'], unique=True, schema='rolevault')


def downgrade() -> None:
    op.drop_index(op.f('ix_rolevault_magic_link_tokens_token'), table_name='magic_link_tokens', schema='rolevault')
    op.drop_index(op.f('ix_rolevault_magic_link_tokens_email'), table_name='magic_link_tokens', schema='rolevault')
    op.drop_table('magic_link_tokens', schema='rolevault')
