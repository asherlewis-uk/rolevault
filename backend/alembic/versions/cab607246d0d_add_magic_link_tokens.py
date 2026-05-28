"""legacy magic-link migration folded into initial baseline

Revision ID: cab607246d0d
Revises: 81ceb44427c3
Create Date: 2026-05-15 16:13:29.998449

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "cab607246d0d"
down_revision: Union[str, None] = "81ceb44427c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
