"""initial

Revision ID: acf1d10fbf13
Revises: 
Create Date: 2026-05-14 10:21:48.614357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'acf1d10fbf13'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS rolevault")
    op.execute("CREATE SCHEMA IF NOT EXISTS public")

    # Create public.users (LibreChat compatibility)
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('avatar', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        schema='public',
    )

    # Create rolevault.users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        schema='rolevault',
    )

    # Create rolevault.characters
    op.create_table(
        'characters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('subtitle', sa.String(500), nullable=True),
        sa.Column('visibility', sa.String(50), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('backstory', sa.Text(), nullable=True),
        sa.Column('response_directive', sa.Text(), nullable=True),
        sa.Column('key_memories', sa.Text(), nullable=True),
        sa.Column('greeting_message', sa.Text(), nullable=True),
        sa.Column('example_message', sa.Text(), nullable=True),
        sa.Column('face_detail', sa.Text(), nullable=True),
        sa.Column('interaction_mode', sa.String(50), nullable=True),
        sa.Column('dynamism', sa.Float(), nullable=True),
        sa.Column('avatar_description', sa.Text(), nullable=True),
        sa.Column('avatar_data', postgresql.BYTEA(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_user_id'], ['rolevault.users.id']),
        schema='rolevault',
    )

    # Create rolevault.personas
    op.create_table(
        'personas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        schema='rolevault',
    )

    # Create rolevault.character_customizations
    op.create_table(
        'character_customizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_favorite', sa.Boolean(), nullable=False),
        sa.Column('backstory', sa.Text(), nullable=True),
        sa.Column('response_directive', sa.Text(), nullable=True),
        sa.Column('key_memories', sa.Text(), nullable=True),
        sa.Column('greeting_message', sa.Text(), nullable=True),
        sa.Column('example_message', sa.Text(), nullable=True),
        sa.Column('face_detail', sa.Text(), nullable=True),
        sa.Column('interaction_mode', sa.String(50), nullable=True),
        sa.Column('dynamism', sa.Float(), nullable=True),
        sa.Column('avatar_description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('character_id', 'user_id', name='uq_customization_character_user'),
        sa.ForeignKeyConstraint(['character_id'], ['rolevault.characters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        schema='rolevault',
    )

    # Create rolevault.conversations
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('persona_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        sa.ForeignKeyConstraint(['character_id'], ['rolevault.characters.id']),
        sa.ForeignKeyConstraint(['persona_id'], ['rolevault.personas.id']),
        schema='rolevault',
    )

    # Create rolevault.journal_entries
    op.create_table(
        'journal_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('trigger_phrase', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        sa.ForeignKeyConstraint(['character_id'], ['rolevault.characters.id']),
        schema='rolevault',
    )

    # Create rolevault.gallery_moments
    op.create_table(
        'gallery_moments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('excerpt', sa.Text(), nullable=True),
        sa.Column('image_data', postgresql.BYTEA(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        sa.ForeignKeyConstraint(['character_id'], ['rolevault.characters.id']),
        sa.ForeignKeyConstraint(['conversation_id'], ['rolevault.conversations.id']),
        schema='rolevault',
    )

    # Create rolevault.messages
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['conversation_id'], ['rolevault.conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['rolevault.users.id']),
        schema='rolevault',
    )

    # Create indexes
    op.create_index('ix_users_email', 'users', ['email'], unique=False, schema='rolevault')
    op.create_index('ix_users_email', 'users', ['email'], unique=False, schema='public')


def downgrade() -> None:
    op.drop_table('messages', schema='rolevault')
    op.drop_table('gallery_moments', schema='rolevault')
    op.drop_table('journal_entries', schema='rolevault')
    op.drop_table('conversations', schema='rolevault')
    op.drop_table('character_customizations', schema='rolevault')
    op.drop_table('personas', schema='rolevault')
    op.drop_table('characters', schema='rolevault')
    op.drop_table('users', schema='rolevault')
    op.drop_table('users', schema='public')
    op.execute("DROP SCHEMA IF EXISTS rolevault")
