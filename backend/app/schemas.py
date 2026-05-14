from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class AppleAuthRequest(BaseModel):
    identity_token: str


# ---------------------------------------------------------------------------
# Character schemas
# ---------------------------------------------------------------------------

class CharacterBase(BaseModel):
    name: str
    subtitle: Optional[str] = None
    visibility: str = "owned"
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
    owner_user_id: UUID
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
    character_id: Optional[UUID] = None
    persona_id: Optional[UUID] = None


class ConversationUpdate(ConversationBase):
    title: Optional[str] = None
    is_archived: Optional[bool] = None


class ConversationResponse(ConversationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    character_id: Optional[UUID] = None
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
    inference_url: str
    models: list[str]
    version: str
