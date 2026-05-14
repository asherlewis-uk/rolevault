import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Text, Boolean, Integer, Float, LargeBinary, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from sqlalchemy.orm import relationship
from app.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    characters = relationship("Character", back_populates="owner", cascade="all, delete-orphan")
    customizations = relationship("CharacterCustomization", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    gallery_moments = relationship("GalleryMoment", back_populates="user", cascade="all, delete-orphan")


class Character(Base):
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    subtitle = Column(String(500), nullable=True)
    visibility = Column(String(50), default="owned", nullable=False)  # owned, legacy, shared
    category = Column(String(100), nullable=True)
    backstory = Column(Text, nullable=True)
    response_directive = Column(Text, nullable=True)
    key_memories = Column(Text, nullable=True)
    greeting_message = Column(Text, nullable=True)
    example_message = Column(Text, nullable=True)
    face_detail = Column(Text, nullable=True)
    interaction_mode = Column(String(50), nullable=True)
    dynamism = Column(Float, nullable=True)
    avatar_description = Column(Text, nullable=True)
    avatar_data = Column(BYTEA, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    owner = relationship("User", back_populates="characters")
    customizations = relationship("CharacterCustomization", back_populates="character", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="character")
    journal_entries = relationship("JournalEntry", back_populates="character", cascade="all, delete-orphan")
    gallery_moments = relationship("GalleryMoment", back_populates="character", cascade="all, delete-orphan")


class CharacterCustomization(Base):
    __tablename__ = "character_customizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.characters.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)

    # Override fields — all nullable; null means "use base character value"
    backstory = Column(Text, nullable=True)
    response_directive = Column(Text, nullable=True)
    key_memories = Column(Text, nullable=True)
    greeting_message = Column(Text, nullable=True)
    example_message = Column(Text, nullable=True)
    face_detail = Column(Text, nullable=True)
    interaction_mode = Column(String(50), nullable=True)
    dynamism = Column(Float, nullable=True)
    avatar_description = Column(Text, nullable=True)

    character = relationship("Character", back_populates="customizations")
    user = relationship("User", back_populates="customizations")

    __table_args__ = (
        UniqueConstraint("character_id", "user_id", name="uq_customization_character_user"),
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.characters.id"), nullable=True)
    persona_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.personas.id"), nullable=True)
    title = Column(String(500), nullable=True)
    model = Column(String(100), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    user = relationship("User", back_populates="conversations")
    character = relationship("Character", back_populates="conversations")
    persona = relationship("Persona", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    gallery_moments = relationship("GalleryMoment", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    user = relationship("User", back_populates="messages")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    user = relationship("User", back_populates="personas")
    conversations = relationship("Conversation", back_populates="persona")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.characters.id"), nullable=False)
    trigger_phrase = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    user = relationship("User", back_populates="journal_entries")
    character = relationship("Character", back_populates="journal_entries")


class LibreChatUser(Base):
    """
    Maps to the LibreChat users table (assumed to be in the 'public' schema).
    This is a read-only / write-through model for auth compatibility.
    Adjust columns if your LibreChat schema differs.
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True, unique=True)
    avatar = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


class GalleryMoment(Base):
    __tablename__ = "gallery_moments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.users.id"), nullable=False)
    character_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.characters.id"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("rolevault.conversations.id"), nullable=True)
    title = Column(String(500), nullable=True)
    excerpt = Column(Text, nullable=True)
    image_data = Column(BYTEA, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    user = relationship("User", back_populates="gallery_moments")
    character = relationship("Character", back_populates="gallery_moments")
    conversation = relationship("Conversation", back_populates="gallery_moments")
