"""add_apple_user_id

Revision ID: 81ceb44427c3
Revises: acf1d10fbf13
Create Date: 2026-05-14 15:35:14.710748

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81ceb44427c3'
down_revision: Union[str, None] = 'acf1d10fbf13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('apple_user_id', sa.String(length=255), nullable=True), schema='rolevault')
    op.create_unique_constraint('uq_users_apple_user_id', 'users', ['apple_user_id'], schema='rolevault')


def downgrade() -> None:
    op.drop_constraint('uq_users_apple_user_id', 'users', schema='rolevault', type_='unique')
    op.drop_column('users', 'apple_user_id', schema='rolevault')
