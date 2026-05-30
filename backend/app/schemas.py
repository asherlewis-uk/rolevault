from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email_verified_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str
    device_id: str = Field(min_length=16, max_length=128)


class AppleAuthRequest(BaseModel):
    identity_token: str
    nonce: str = Field(min_length=32)
    device_id: str = Field(min_length=16, max_length=128)
    platform: Optional[str] = Field(default=None, max_length=50)


class MagicLinkRequest(BaseModel):
    email: EmailStr
    device_id: str = Field(min_length=16, max_length=128)


class MagicLinkVerifyRequest(BaseModel):
    token: str = Field(min_length=32)
    nonce: str = Field(min_length=32)
    device_id: str = Field(min_length=16, max_length=128)


# ---------------------------------------------------------------------------
# Character schemas
# ---------------------------------------------------------------------------

class CharacterBase(BaseModel):
    name: str
    subtitle: Optional[str] = None
    visibility: str = "global"
    category: Optional[str] = None
    backstory: Optional[str] = None
    response_directive: Optional[str] = None
    key_memories: Optional[str] = None
    greeting_message: Optional[str] = None
    example_message: Optional[str] = None
    face_detail: Optional[str] = None
    interaction_mode: Optional[str] = None
    dynamism: Optional[float] = None
    avatar_description: Optional[str] = None


class CharacterCreate(CharacterBase):
    pass


class CharacterUpdate(CharacterBase):
    name: Optional[str] = None
    visibility: Optional[str] = None


class CharacterResponse(CharacterBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class CharacterCustomizationBase(BaseModel):
    is_favorite: bool = False
    backstory: Optional[str] = None
    response_directive: Optional[str] = None
    key_memories: Optional[str] = None
    greeting_message: Optional[str] = None
    example_message: Optional[str] = None
    face_detail: Optional[str] = None
    interaction_mode: Optional[str] = None
    dynamism: Optional[float] = None
    avatar_description: Optional[str] = None


class CharacterCustomizationUpsert(CharacterCustomizationBase):
    pass


class CharacterCustomizationResponse(CharacterCustomizationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    character_id: UUID
    user_id: UUID


class CharacterWithCustomizationResponse(CharacterResponse):
    customization: Optional[CharacterCustomizationResponse] = None


# ---------------------------------------------------------------------------
# Conversation / Message schemas
# ---------------------------------------------------------------------------

class ConversationBase(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    is_archived: bool = False


class ConversationCreate(ConversationBase):
    character_id: UUID
    persona_id: Optional[UUID] = None


class ConversationUpdate(ConversationBase):
    title: Optional[str] = None
    is_archived: Optional[bool] = None


class ConversationResponse(ConversationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    character_id: UUID
    persona_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime


class MessageBase(BaseModel):
    role: str
    content: str


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    user_id: UUID
    created_at: datetime


# ---------------------------------------------------------------------------
# Persona schemas
# ---------------------------------------------------------------------------

class PersonaBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = False


class PersonaCreate(PersonaBase):
    pass


class PersonaUpdate(PersonaBase):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class PersonaResponse(PersonaBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Journal schemas
# ---------------------------------------------------------------------------

class JournalEntryBase(BaseModel):
    character_id: UUID
    trigger_phrase: str
    content: str


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryResponse(JournalEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Gallery schemas
# ---------------------------------------------------------------------------

class GalleryMomentBase(BaseModel):
    character_id: UUID
    conversation_id: Optional[UUID] = None
    title: Optional[str] = None
    excerpt: Optional[str] = None


class GalleryMomentCreate(GalleryMomentBase):
    pass


class GalleryMomentResponse(GalleryMomentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime


# ---------------------------------------------------------------------------
# Config schema
# ---------------------------------------------------------------------------

class ConfigResponse(BaseModel):
    models: list[str]
    version: str


# ---------------------------------------------------------------------------
# Inference schemas
# ---------------------------------------------------------------------------

class ChatMessagePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=20_000)


class InferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: Optional[str] = Field(default=None, min_length=1, max_length=120)
    prompt: Optional[str] = Field(default=None, min_length=1, max_length=20_000)
    messages: Optional[list[ChatMessagePayload]] = Field(default=None, min_length=1, max_length=100)
    character_id: Optional[UUID] = Field(default=None)
    conversation_id: Optional[UUID] = Field(default=None)
    stream: bool = True
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, ge=1, le=8192)

    @model_validator(mode="after")
    def require_prompt_or_messages(self) -> "InferenceRequest":
        if self.prompt is None and not self.messages:
            raise ValueError("Either prompt or messages is required")
        return self


class ExternalInferenceRequest(InferenceRequest):
    provider: Literal["openai", "anthropic"]
    api_key: str = Field(min_length=20, max_length=4096, repr=False)

# ---------------------------------------------------------------------------
# WebSocket schemas
# ---------------------------------------------------------------------------

class WSMessageIn(BaseModel):
    """Incoming message from a WebSocket client."""
    role: Literal["user"]
    content: str = Field(min_length=1, max_length=20_000)


class WSMessageOut(BaseModel):
    """Message broadcast to all WebSocket clients in a conversation."""
    type: Literal["message_created"] = "message_created"
    message: MessageResponse


class WSUserEvent(BaseModel):
    """Presence event: a user joined or left the conversation."""
    type: Literal["user_joined", "user_left"]
    user_id: UUID
    display_name: Optional[str] = None


class WSError(BaseModel):
    """Error event sent to a single WebSocket client."""
    type: Literal["error"] = "error"
    detail: str
