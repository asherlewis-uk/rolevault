"""phase1 passwordless auth and strict data scopes

Revision ID: e7f41d1c2a90
Revises: cab607246d0d
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e7f41d1c2a90"
down_revision: Union[str, None] = "cab607246d0d"
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


def _constraint_exists(name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.scalar(
            sa.text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = :name
                      AND connamespace = 'rolevault'::regnamespace
                )
                """
            ),
            {"name": name},
        )
    )


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.scalar(
            sa.text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'rolevault'
                      AND table_name = :table_name
                )
                """
            ),
            {"table_name": table_name},
        )
    )


def _add_constraint_if_missing(name: str, ddl: str) -> None:
    if not _constraint_exists(name):
        op.execute(ddl)


def _enable_user_rls(table_name: str) -> None:
    predicate = f"user_id = {_CURRENT_USER_ID} OR {_SERVICE_ROLE}"
    op.execute(f"ALTER TABLE rolevault.{table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE rolevault.{table_name} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {table_name}_user_isolation ON rolevault.{table_name}")
    op.execute(
        f"CREATE POLICY {table_name}_user_isolation ON rolevault.{table_name} "
        f"FOR ALL USING ({predicate}) WITH CHECK ({predicate})"
    )


def _enable_user_profile_rls() -> None:
    predicate = f"id = {_CURRENT_USER_ID} OR {_SERVICE_ROLE}"
    op.execute("ALTER TABLE rolevault.users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rolevault.users FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS users_self_or_service ON rolevault.users")
    op.execute(
        "CREATE POLICY users_self_or_service ON rolevault.users "
        f"FOR ALL USING ({predicate}) WITH CHECK ({predicate})"
    )


def _enable_character_pool_rls() -> None:
    op.execute("ALTER TABLE rolevault.characters ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rolevault.characters FORCE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS characters_global_read ON rolevault.characters")
    op.execute("DROP POLICY IF EXISTS characters_service_write ON rolevault.characters")
    op.execute("CREATE POLICY characters_global_read ON rolevault.characters FOR SELECT USING (true)")
    op.execute(
        "CREATE POLICY characters_service_write ON rolevault.characters "
        f"FOR ALL USING ({_SERVICE_ROLE}) WITH CHECK ({_SERVICE_ROLE})"
    )


def _enable_service_rls(table_name: str) -> None:
    op.execute(f"ALTER TABLE rolevault.{table_name} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE rolevault.{table_name} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {table_name}_service_only ON rolevault.{table_name}")
    op.execute(
        f"CREATE POLICY {table_name}_service_only ON rolevault.{table_name} "
        f"FOR ALL USING ({_SERVICE_ROLE}) WITH CHECK ({_SERVICE_ROLE})"
    )


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.users")
    op.execute("ALTER TABLE rolevault.users DROP COLUMN IF EXISTS password")

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'rolevault'
                  AND table_name = 'users'
                  AND column_name = 'apple_user_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'rolevault'
                  AND table_name = 'users'
                  AND column_name = 'apple_subject'
            ) THEN
                ALTER TABLE rolevault.users RENAME COLUMN apple_user_id TO apple_subject;
            END IF;
        END $$;
        """
    )
    op.execute("ALTER TABLE rolevault.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ")
    op.execute("ALTER TABLE rolevault.users ADD COLUMN IF NOT EXISTS apple_subject VARCHAR(255)")
    op.execute("ALTER TABLE rolevault.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ")
    op.execute("ALTER TABLE rolevault.users ALTER COLUMN email DROP NOT NULL")
    op.execute("UPDATE rolevault.users SET email = lower(email) WHERE email IS NOT NULL")
    _add_constraint_if_missing(
        "ck_users_auth_identity",
        "ALTER TABLE rolevault.users ADD CONSTRAINT ck_users_auth_identity "
        "CHECK (email IS NOT NULL OR apple_subject IS NOT NULL)",
    )
    _add_constraint_if_missing(
        "ck_users_email_lowercase",
        "ALTER TABLE rolevault.users ADD CONSTRAINT ck_users_email_lowercase "
        "CHECK (email IS NULL OR email = lower(email))",
    )
    _add_constraint_if_missing(
        "uq_users_apple_subject",
        "ALTER TABLE rolevault.users ADD CONSTRAINT uq_users_apple_subject UNIQUE (apple_subject)",
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_apple_subject ON rolevault.users (apple_subject)")

    op.execute("ALTER TABLE rolevault.characters DROP CONSTRAINT IF EXISTS characters_owner_user_id_fkey")
    op.execute("ALTER TABLE rolevault.characters DROP COLUMN IF EXISTS owner_user_id")
    op.execute(
        """
        UPDATE rolevault.characters
        SET visibility = 'global'
        WHERE visibility IS NULL OR visibility NOT IN ('global', 'system', 'archived')
        """
    )
    op.execute("ALTER TABLE rolevault.characters ALTER COLUMN visibility SET DEFAULT 'global'")
    _add_constraint_if_missing(
        "ck_characters_global_visibility",
        "ALTER TABLE rolevault.characters ADD CONSTRAINT ck_characters_global_visibility "
        "CHECK (visibility IN ('global', 'system', 'archived'))",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_characters_category_name "
        "ON rolevault.characters (category, name)"
    )

    if not _table_exists("device_sessions"):
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
            sa.CheckConstraint(
                "length(session_token_hash) >= 32",
                name="ck_device_sessions_token_hash_length",
            ),
            sa.ForeignKeyConstraint(["user_id"], ["rolevault.users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "device_id", name="uq_device_sessions_user_device"),
            sa.UniqueConstraint("session_token_hash", name="uq_device_sessions_session_token_hash"),
            sa.UniqueConstraint("refresh_token_hash", name="uq_device_sessions_refresh_token_hash"),
            schema="rolevault",
        )
    op.execute("CREATE INDEX IF NOT EXISTS ix_device_sessions_user_id ON rolevault.device_sessions (user_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_device_sessions_session_token_hash "
        "ON rolevault.device_sessions (session_token_hash)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_device_sessions_refresh_token_hash "
        "ON rolevault.device_sessions (refresh_token_hash)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_device_sessions_user_last_seen "
        "ON rolevault.device_sessions (user_id, last_seen_at)"
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'rolevault'
                  AND table_name = 'magic_link_tokens'
                  AND column_name = 'token'
            ) THEN
                DROP TABLE rolevault.magic_link_tokens;
            END IF;
        END $$;
        """
    )
    if not _table_exists("magic_link_tokens"):
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
    op.execute("CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_email ON rolevault.magic_link_tokens (email)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_token_hash "
        "ON rolevault.magic_link_tokens (token_hash)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_nonce_hash "
        "ON rolevault.magic_link_tokens (nonce_hash)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_device_id "
        "ON rolevault.magic_link_tokens (device_id)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_user_id ON rolevault.magic_link_tokens (user_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_magic_link_tokens_email_created "
        "ON rolevault.magic_link_tokens (email, created_at)"
    )

    op.execute("ALTER TABLE rolevault.character_customizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ")
    op.execute("ALTER TABLE rolevault.character_customizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ")
    op.execute(
        """
        UPDATE rolevault.character_customizations
        SET created_at = COALESCE(created_at, now()),
            updated_at = COALESCE(updated_at, now())
        """
    )
    op.execute("ALTER TABLE rolevault.character_customizations ALTER COLUMN created_at SET NOT NULL")
    op.execute("ALTER TABLE rolevault.character_customizations ALTER COLUMN updated_at SET NOT NULL")
    op.execute(
        "ALTER TABLE rolevault.character_customizations "
        "DROP CONSTRAINT IF EXISTS uq_customization_character_user"
    )
    _add_constraint_if_missing(
        "uq_customizations_user_character",
        "ALTER TABLE rolevault.character_customizations "
        "ADD CONSTRAINT uq_customizations_user_character UNIQUE (user_id, character_id)",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_customizations_user_favorite "
        "ON rolevault.character_customizations (user_id, is_favorite)"
    )

    _add_constraint_if_missing(
        "uq_personas_id_user",
        "ALTER TABLE rolevault.personas ADD CONSTRAINT uq_personas_id_user UNIQUE (id, user_id)",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_personas_one_active_per_user "
        "ON rolevault.personas (user_id) WHERE is_active"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_personas_user_active "
        "ON rolevault.personas (user_id, is_active)"
    )

    op.execute(
        """
        DELETE FROM rolevault.conversations
        WHERE character_id IS NULL
        """
    )
    op.execute("ALTER TABLE rolevault.conversations ALTER COLUMN character_id SET NOT NULL")
    op.execute(
        """
        UPDATE rolevault.conversations c
        SET persona_id = NULL
        WHERE persona_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM rolevault.personas p
              WHERE p.id = c.persona_id
                AND p.user_id = c.user_id
          )
        """
    )
    _add_constraint_if_missing(
        "uq_conversations_id_user",
        "ALTER TABLE rolevault.conversations ADD CONSTRAINT uq_conversations_id_user UNIQUE (id, user_id)",
    )
    _add_constraint_if_missing(
        "fk_conversations_persona_user",
        "ALTER TABLE rolevault.conversations ADD CONSTRAINT fk_conversations_persona_user "
        "FOREIGN KEY (persona_id, user_id) REFERENCES rolevault.personas (id, user_id)",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_conversations_user_updated "
        "ON rolevault.conversations (user_id, updated_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_conversations_user_character "
        "ON rolevault.conversations (user_id, character_id)"
    )

    op.execute(
        """
        UPDATE rolevault.messages m
        SET user_id = c.user_id
        FROM rolevault.conversations c
        WHERE m.conversation_id = c.id
          AND m.user_id <> c.user_id
        """
    )
    _add_constraint_if_missing(
        "fk_messages_conversation_user",
        "ALTER TABLE rolevault.messages ADD CONSTRAINT fk_messages_conversation_user "
        "FOREIGN KEY (conversation_id, user_id) "
        "REFERENCES rolevault.conversations (id, user_id) ON DELETE CASCADE",
    )
    _add_constraint_if_missing(
        "ck_messages_role",
        "ALTER TABLE rolevault.messages ADD CONSTRAINT ck_messages_role "
        "CHECK (role IN ('user', 'assistant', 'system'))",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_messages_conversation_created "
        "ON rolevault.messages (conversation_id, created_at)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_user_created ON rolevault.messages (user_id, created_at)")

    _add_constraint_if_missing(
        "uq_journal_user_character_trigger",
        "ALTER TABLE rolevault.journal_entries ADD CONSTRAINT uq_journal_user_character_trigger "
        "UNIQUE (user_id, character_id, trigger_phrase)",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_journal_entries_user_character "
        "ON rolevault.journal_entries (user_id, character_id)"
    )

    op.execute(
        """
        UPDATE rolevault.gallery_moments gm
        SET conversation_id = NULL
        WHERE conversation_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM rolevault.conversations c
              WHERE c.id = gm.conversation_id
                AND c.user_id = gm.user_id
          )
        """
    )
    _add_constraint_if_missing(
        "fk_gallery_moments_conversation_user",
        "ALTER TABLE rolevault.gallery_moments ADD CONSTRAINT fk_gallery_moments_conversation_user "
        "FOREIGN KEY (conversation_id, user_id) "
        "REFERENCES rolevault.conversations (id, user_id) ON DELETE CASCADE",
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_gallery_moments_user_character "
        "ON rolevault.gallery_moments (user_id, character_id)"
    )

    _enable_user_profile_rls()
    _enable_character_pool_rls()
    for table_name in _USER_SCOPED_TABLES:
        _enable_user_rls(table_name)
    _enable_service_rls("magic_link_tokens")


def downgrade() -> None:
    for table_name in ("magic_link_tokens", *_USER_SCOPED_TABLES, "characters", "users"):
        op.execute(f"ALTER TABLE IF EXISTS rolevault.{table_name} DISABLE ROW LEVEL SECURITY")
