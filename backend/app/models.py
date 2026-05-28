from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import ClassVar, Self

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import BYTEA, UUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship
from sqlalchemy.sql import Select
from sqlalchemy.sql.elements import ColumnElement

from app.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class UserScopedMixin:
    __private_scope_column__: ClassVar[str] = "user_id"
    __rls_predicate__: ClassVar[str] = (
        "user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid"
    )

    @declared_attr
    def user_id(cls) -> Mapped[uuid.UUID]:
        return mapped_column(
            UUID(as_uuid=True),
            ForeignKey("rolevault.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )

    @classmethod
    def scoped_to(cls, user_id: uuid.UUID) -> ColumnElement[bool]:
        return cls.user_id == user_id

    @classmethod
    def scoped_select(cls, user_id: uuid.UUID) -> Select[tuple[Self]]:
        return select(cls).where(cls.scoped_to(user_id))


class User(Base):
    __tablename__ = "users"
    __rls_predicate__: ClassVar[str] = (
        "id = NULLIF(current_setting('app.current_user_id', true), '')::uuid"
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    apple_subject: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    device_sessions: Mapped[list[DeviceSession]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    magic_link_tokens: Mapped[list[MagicLinkToken]] = relationship(back_populates="user")
    customizations: Mapped[list[CharacterCustomization]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    conversations: Mapped[list[Conversation]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list[Message]] = relationship(back_populates="user", cascade="all, delete-orphan")
    personas: Mapped[list[Persona]] = relationship(back_populates="user", cascade="all, delete-orphan")
    journal_entries: Mapped[list[JournalEntry]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    gallery_moments: Mapped[list[GalleryMoment]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("email IS NOT NULL OR apple_subject IS NOT NULL", name="ck_users_auth_identity"),
        CheckConstraint("email IS NULL OR email = lower(email)", name="ck_users_email_lowercase"),
    )


class DeviceSession(UserScopedMixin, Base):
    __tablename__ = "device_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    session_token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="device_sessions")

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_device_sessions_user_device"),
        CheckConstraint("length(device_id) >= 16", name="ck_device_sessions_device_id_entropy"),
        CheckConstraint("length(session_token_hash) >= 32", name="ck_device_sessions_token_hash_length"),
        Index("ix_device_sessions_user_last_seen", "user_id", "last_seen_at"),
    )


class MagicLinkToken(Base):
    __tablename__ = "magic_link_tokens"
    __service_scoped__: ClassVar[bool] = True

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    nonce_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rolevault.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="magic_link_tokens")

    __table_args__ = (
        CheckConstraint("email = lower(email)", name="ck_magic_link_tokens_email_lowercase"),
        CheckConstraint("length(device_id) >= 16", name="ck_magic_link_tokens_device_id_entropy"),
        CheckConstraint("length(token_hash) >= 32", name="ck_magic_link_tokens_token_hash_length"),
        CheckConstraint("length(nonce_hash) >= 32", name="ck_magic_link_tokens_nonce_hash_length"),
        Index("ix_magic_link_tokens_email_created", "email", "created_at"),
    )

    @property
    def is_consumed(self) -> bool:
        return self.consumed_at is not None


class Character(Base):
    __tablename__ = "characters"
    __global_scope__: ClassVar[bool] = True

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    visibility: Mapped[str] = mapped_column(String(50), default="global", nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    backstory: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_directive: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_memories: Mapped[str | None] = mapped_column(Text, nullable=True)
    greeting_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    face_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    interaction_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dynamism: Mapped[float | None] = mapped_column(Float, nullable=True)
    avatar_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_data: Mapped[bytes | None] = mapped_column(BYTEA, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    customizations: Mapped[list[CharacterCustomization]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
    )
    conversations: Mapped[list[Conversation]] = relationship(back_populates="character")
    journal_entries: Mapped[list[JournalEntry]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
    )
    gallery_moments: Mapped[list[GalleryMoment]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "visibility IN ('global', 'system', 'archived')",
            name="ck_characters_global_visibility",
        ),
        Index("ix_characters_category_name", "category", "name"),
    )


class CharacterCustomization(UserScopedMixin, Base):
    __tablename__ = "character_customizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rolevault.characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    backstory: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_directive: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_memories: Mapped[str | None] = mapped_column(Text, nullable=True)
    greeting_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    face_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    interaction_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dynamism: Mapped[float | None] = mapped_column(Float, nullable=True)
    avatar_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    character: Mapped[Character] = relationship(back_populates="customizations")
    user: Mapped[User] = relationship(back_populates="customizations")

    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_customizations_user_character"),
        Index("ix_customizations_user_favorite", "user_id", "is_favorite"),
    )


class Persona(UserScopedMixin, Base):
    __tablename__ = "personas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="personas")
    conversations: Mapped[list[Conversation]] = relationship(back_populates="persona")

    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_personas_id_user"),
        Index("ix_personas_user_active", "user_id", "is_active"),
        Index("ix_personas_one_active_per_user", "user_id", unique=True, postgresql_where=text("is_active")),
    )


class Conversation(UserScopedMixin, Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rolevault.characters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    persona_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="conversations")
    character: Mapped[Character] = relationship(back_populates="conversations")
    persona: Mapped[Persona | None] = relationship(back_populates="conversations")
    messages: Mapped[list[Message]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    gallery_moments: Mapped[list[GalleryMoment]] = relationship(back_populates="conversation")

    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_conversations_id_user"),
        ForeignKeyConstraint(
            ["persona_id", "user_id"],
            ["rolevault.personas.id", "rolevault.personas.user_id"],
            name="fk_conversations_persona_user",
        ),
        Index("ix_conversations_user_updated", "user_id", "updated_at"),
        Index("ix_conversations_user_character", "user_id", "character_id"),
    )


class Message(UserScopedMixin, Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    user: Mapped[User] = relationship(back_populates="messages")

    __table_args__ = (
        ForeignKeyConstraint(
            ["conversation_id", "user_id"],
            ["rolevault.conversations.id", "rolevault.conversations.user_id"],
            ondelete="CASCADE",
            name="fk_messages_conversation_user",
        ),
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
        Index("ix_messages_user_created", "user_id", "created_at"),
    )


class JournalEntry(UserScopedMixin, Base):
    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rolevault.characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_phrase: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        onupdate=now_utc,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="journal_entries")
    character: Mapped[Character] = relationship(back_populates="journal_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "character_id", "trigger_phrase", name="uq_journal_user_character_trigger"),
        Index("ix_journal_entries_user_character", "user_id", "character_id"),
    )


class GalleryMoment(UserScopedMixin, Base):
    __tablename__ = "gallery_moments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rolevault.characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_data: Mapped[bytes | None] = mapped_column(BYTEA, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)

    user: Mapped[User] = relationship(back_populates="gallery_moments")
    character: Mapped[Character] = relationship(back_populates="gallery_moments")
    conversation: Mapped[Conversation | None] = relationship(back_populates="gallery_moments")

    __table_args__ = (
        ForeignKeyConstraint(
            ["conversation_id", "user_id"],
            ["rolevault.conversations.id", "rolevault.conversations.user_id"],
            ondelete="CASCADE",
            name="fk_gallery_moments_conversation_user",
        ),
        Index("ix_gallery_moments_user_character", "user_id", "character_id"),
    )
