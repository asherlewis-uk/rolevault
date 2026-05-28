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
revision: str = "acf1d10fbf13"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CURRENT_USER_ID = "NULLIF(current_setting('app.current_user_id', true), '')::uuid"
_SERVICE_ROLE = "current_setting('app.is_service_role', true) = 'true'"

_USER_SCOPED_TABLES = (
    "device_sessions",
    "character_customizations",
    "personas",
    "conversations",
    "messages",
    "journal_entries",
    "gallery_moments",
)

_SERVICE_SCOPED_TABLES = ("magic_link_tokens",)


def _enable_user_rls(table_name: str) -> None:
    predicate = f"user_id = {_CURRENT_USER_ID} OR {_SERVICE_ROLE}"
    op.execute(f"ALTER TABLE rolevault.{table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE rolevault.{table_name} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"CREATE POLICY {table_name}_user_isolation ON rolevault.{table_name} "
        f"FOR ALL USING ({predicate}) WITH CHECK ({predicate})"
    )


def _enable_user_profile_rls() -> None:
    predicate = f"id = {_CURRENT_USER_ID} OR {_SERVICE_ROLE}"
    op.execute("ALTER TABLE rolevault.users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rolevault.users FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY users_self_or_service ON rolevault.users "
        f"FOR ALL USING ({predicate}) WITH CHECK ({predicate})"
    )


def _enable_character_pool_rls() -> None:
    op.execute("ALTER TABLE rolevault.characters ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rolevault.characters FORCE ROW LEVEL SECURITY")
    op.execute("CREATE POLICY characters_global_read ON rolevault.characters FOR SELECT USING (true)")
    op.execute(
        "CREATE POLICY characters_service_write ON rolevault.characters "
        f"FOR ALL USING ({_SERVICE_ROLE}) WITH CHECK ({_SERVICE_ROLE})"
    )


def _enable_service_rls(table_name: str) -> None:
    op.execute(f"ALTER TABLE rolevault.{table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE rolevault.{table_name} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"CREATE POLICY {table_name}_service_only ON rolevault.{table_name} "
        f"FOR ALL USING ({_SERVICE_ROLE}) WITH CHECK ({_SERVICE_ROLE})"
    )


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS rolevault")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("apple_subject", sa.String(length=255), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("email IS NOT NULL OR apple_subject IS NOT NULL", name="ck_users_auth_identity"),
        sa.CheckConstraint("email IS NULL OR email = lower(email)", name="ck_users_email_lowercase"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("apple_subject", name="uq_users_apple_subject"),
        schema="rolevault",
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False, schema="rolevault")
    op.create_index("ix_users_apple_subject", "users", ["apple_subject"], unique=False, schema="rolevault")

    op.create_table(
        "characters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("subtitle", sa.String(length=500), nullable=True),
        sa.Column("visibility", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("backstory", sa.Text(), nullable=True),
        sa.Column("response_directive", sa.Text(), nullable=True),
        sa.Column("key_memories", sa.Text(), nullable=True),
        sa.Column("greeting_message", sa.Text(), nullable=True),
        sa.Column("example_message", sa.Text(), nullable=True),
        sa.Column("face_detail", sa.Text(), nullable=True),
        sa.Column("interaction_mode", sa.String(length=50), nullable=True),
        sa.Column("dynamism", sa.Float(), nullable=True),
        sa.Column("avatar_description", sa.Text(), nullable=True),
        sa.Column("avatar_data", postgresql.BYTEA(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "visibility IN ('global', 'system', 'archived')",
            name="ck_characters_global_visibility",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="rolevault",
    )
    op.create_index("ix_characters_category_name", "characters", ["category", "name"], schema="rolevault")

    op.create_table(
        "device_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=False),
        sa.Column("session_token_hash", sa.String(length=255), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=255), nullable=True),
        sa.Column("platform", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_hash", sa.String(length=128), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(device_id) >= 16", name="ck_device_sessions_device_id_entropy"),
        sa.CheckConstraint("length(session_token_hash) >= 32", name="ck_device_sessions_token_hash_length"),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "device_id", name="uq_device_sessions_user_device"),
        sa.UniqueConstraint("session_token_hash", name="uq_device_sessions_session_token_hash"),
        sa.UniqueConstraint("refresh_token_hash", name="uq_device_sessions_refresh_token_hash"),
        schema="rolevault",
    )
    op.create_index("ix_device_sessions_user_id", "device_sessions", ["user_id"], schema="rolevault")
    op.create_index("ix_device_sessions_session_token_hash", "device_sessions", ["session_token_hash"], schema="rolevault")
    op.create_index("ix_device_sessions_refresh_token_hash", "device_sessions", ["refresh_token_hash"], schema="rolevault")
    op.create_index("ix_device_sessions_user_last_seen", "device_sessions", ["user_id", "last_seen_at"], schema="rolevault")

    op.create_table(
        "magic_link_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("nonce_hash", sa.String(length=255), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("email = lower(email)", name="ck_magic_link_tokens_email_lowercase"),
        sa.CheckConstraint("length(device_id) >= 16", name="ck_magic_link_tokens_device_id_entropy"),
        sa.CheckConstraint("length(token_hash) >= 32", name="ck_magic_link_tokens_token_hash_length"),
        sa.CheckConstraint("length(nonce_hash) >= 32", name="ck_magic_link_tokens_nonce_hash_length"),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_magic_link_tokens_token_hash"),
        sa.UniqueConstraint("nonce_hash", name="uq_magic_link_tokens_nonce_hash"),
        schema="rolevault",
    )
    op.create_index("ix_magic_link_tokens_email", "magic_link_tokens", ["email"], schema="rolevault")
    op.create_index("ix_magic_link_tokens_token_hash", "magic_link_tokens", ["token_hash"], schema="rolevault")
    op.create_index("ix_magic_link_tokens_nonce_hash", "magic_link_tokens", ["nonce_hash"], schema="rolevault")
    op.create_index("ix_magic_link_tokens_device_id", "magic_link_tokens", ["device_id"], schema="rolevault")
    op.create_index("ix_magic_link_tokens_user_id", "magic_link_tokens", ["user_id"], schema="rolevault")
    op.create_index("ix_magic_link_tokens_email_created", "magic_link_tokens", ["email", "created_at"], schema="rolevault")

    op.create_table(
        "personas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "user_id", name="uq_personas_id_user"),
        schema="rolevault",
    )
    op.create_index("ix_personas_user_id", "personas", ["user_id"], schema="rolevault")
    op.create_index("ix_personas_user_active", "personas", ["user_id", "is_active"], schema="rolevault")
    op.create_index(
        "ix_personas_one_active_per_user",
        "personas",
        ["user_id"],
        unique=True,
        schema="rolevault",
        postgresql_where=sa.text("is_active"),
    )

    op.create_table(
        "character_customizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("backstory", sa.Text(), nullable=True),
        sa.Column("response_directive", sa.Text(), nullable=True),
        sa.Column("key_memories", sa.Text(), nullable=True),
        sa.Column("greeting_message", sa.Text(), nullable=True),
        sa.Column("example_message", sa.Text(), nullable=True),
        sa.Column("face_detail", sa.Text(), nullable=True),
        sa.Column("interaction_mode", sa.String(length=50), nullable=True),
        sa.Column("dynamism", sa.Float(), nullable=True),
        sa.Column("avatar_description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["rolevault.characters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "character_id", name="uq_customizations_user_character"),
        schema="rolevault",
    )
    op.create_index("ix_character_customizations_user_id", "character_customizations", ["user_id"], schema="rolevault")
    op.create_index("ix_character_customizations_character_id", "character_customizations", ["character_id"], schema="rolevault")
    op.create_index("ix_customizations_user_favorite", "character_customizations", ["user_id", "is_favorite"], schema="rolevault")

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("persona_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["rolevault.characters.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["persona_id", "user_id"], ["rolevault.personas.id", "rolevault.personas.user_id"], name="fk_conversations_persona_user"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "user_id", name="uq_conversations_id_user"),
        schema="rolevault",
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"], schema="rolevault")
    op.create_index("ix_conversations_character_id", "conversations", ["character_id"], schema="rolevault")
    op.create_index("ix_conversations_persona_id", "conversations", ["persona_id"], schema="rolevault")
    op.create_index("ix_conversations_user_updated", "conversations", ["user_id", "updated_at"], schema="rolevault")
    op.create_index("ix_conversations_user_character", "conversations", ["user_id", "character_id"], schema="rolevault")

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id", "user_id"], ["rolevault.conversations.id", "rolevault.conversations.user_id"], ondelete="CASCADE", name="fk_messages_conversation_user"),
        sa.PrimaryKeyConstraint("id"),
        schema="rolevault",
    )
    op.create_index("ix_messages_user_id", "messages", ["user_id"], schema="rolevault")
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"], schema="rolevault")
    op.create_index("ix_messages_conversation_created", "messages", ["conversation_id", "created_at"], schema="rolevault")
    op.create_index("ix_messages_user_created", "messages", ["user_id", "created_at"], schema="rolevault")

    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trigger_phrase", sa.String(length=500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["rolevault.characters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "character_id", "trigger_phrase", name="uq_journal_user_character_trigger"),
        schema="rolevault",
    )
    op.create_index("ix_journal_entries_user_id", "journal_entries", ["user_id"], schema="rolevault")
    op.create_index("ix_journal_entries_character_id", "journal_entries", ["character_id"], schema="rolevault")
    op.create_index("ix_journal_entries_user_character", "journal_entries", ["user_id", "character_id"], schema="rolevault")

    op.create_table(
        "gallery_moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("character_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("image_data", postgresql.BYTEA(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["rolevault.characters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id", "user_id"], ["rolevault.conversations.id", "rolevault.conversations.user_id"], ondelete="CASCADE", name="fk_gallery_moments_conversation_user"),
        sa.PrimaryKeyConstraint("id"),
        schema="rolevault",
    )
    op.create_index("ix_gallery_moments_user_id", "gallery_moments", ["user_id"], schema="rolevault")
    op.create_index("ix_gallery_moments_character_id", "gallery_moments", ["character_id"], schema="rolevault")
    op.create_index("ix_gallery_moments_conversation_id", "gallery_moments", ["conversation_id"], schema="rolevault")
    op.create_index("ix_gallery_moments_user_character", "gallery_moments", ["user_id", "character_id"], schema="rolevault")

    _enable_user_profile_rls()
    _enable_character_pool_rls()
    for table_name in _USER_SCOPED_TABLES:
        _enable_user_rls(table_name)
    for table_name in _SERVICE_SCOPED_TABLES:
        _enable_service_rls(table_name)


def downgrade() -> None:
    op.drop_table("gallery_moments", schema="rolevault")
    op.drop_table("journal_entries", schema="rolevault")
    op.drop_table("messages", schema="rolevault")
    op.drop_table("conversations", schema="rolevault")
    op.drop_table("character_customizations", schema="rolevault")
    op.drop_table("personas", schema="rolevault")
    op.drop_table("magic_link_tokens", schema="rolevault")
    op.drop_table("device_sessions", schema="rolevault")
    op.drop_table("characters", schema="rolevault")
    op.drop_table("users", schema="rolevault")
    op.execute("DROP SCHEMA IF EXISTS rolevault")
