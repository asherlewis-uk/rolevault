"""legacy apple identifier migration folded into initial baseline

Revision ID: 81ceb44427c3
Revises: acf1d10fbf13
Create Date: 2026-05-14 15:35:14.710748

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "81ceb44427c3"
down_revision: Union[str, None] = "acf1d10fbf13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
