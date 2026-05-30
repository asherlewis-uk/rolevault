import json
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import async_session_maker, get_db
from app.models import User, Conversation, Message
from app.memory.embeddings import SentenceTransformersEmbedder
from app.memory.vector_store import ChromaVectorStore
from app.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
    WSMessageIn,
    WSMessageOut,
    WSUserEvent,
    WSError,
)
from app.auth.dependencies import get_current_user, get_current_user_ws

router = APIRouter()
_embedder = SentenceTransformersEmbedder()
_vector_store = ChromaVectorStore(persist_path="./chroma_data")


class ConnectionManager:
    """Manages active WebSocket connections per conversation with pub/sub broadcast."""

    def __init__(self) -> None:
        # conversation_id -> {WebSocket, ...}
        self._connections: dict[UUID, dict[WebSocket, dict[str, object]]] = {}

    async def connect(
        self,
        conversation_id: UUID,
        websocket: WebSocket,
        user_id: UUID,
        display_name: str | None,
    ) -> None:
        await websocket.accept()
        conv = self._connections.setdefault(conversation_id, {})
        conv[websocket] = {"user_id": user_id, "display_name": display_name}

        # Broadcast join event to other participants
        join_event = WSUserEvent(
            type="user_joined",
            user_id=user_id,
            display_name=display_name,
        )
        await self._broadcast_raw(conversation_id, join_event.model_dump_json(), exclude=websocket)

    async def disconnect(self, conversation_id: UUID, websocket: WebSocket) -> None:
        conv = self._connections.get(conversation_id)
        if conv is None:
            return

        meta = conv.pop(websocket, None)
        if not conv:
            self._connections.pop(conversation_id, None)

        if meta:
            leave_event = WSUserEvent(
                type="user_left",
                user_id=meta["user_id"],
                display_name=meta.get("display_name"),
            )
            await self._broadcast_raw(conversation_id, leave_event.model_dump_json())

    async def broadcast_message(
        self,
        conversation_id: UUID,
        message: MessageResponse,
        exclude: WebSocket | None = None,
    ) -> None:
        event = WSMessageOut(message=message)
        await self._broadcast_raw(conversation_id, event.model_dump_json(), exclude=exclude)

    async def _broadcast_raw(
        self,
        conversation_id: UUID,
        payload: str,
        exclude: WebSocket | None = None,
    ) -> None:
        conv = self._connections.get(conversation_id)
        if conv is None:
            return

        dead: list[WebSocket] = []
        for ws in conv:
            if ws is exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.disconnect(conversation_id, ws)

    async def send_error(self, websocket: WebSocket, detail: str) -> None:
        event = WSError(detail=detail)
        try:
            await websocket.send_text(event.model_dump_json())
        except Exception:
            pass


manager = ConnectionManager()


def _index_message_for_memory(
    user_id: str,
    character_id: str,
    message_id: str,
    content: str,
    role: str,
) -> None:
    """Background task to index a message in the vector store."""
    try:
        from uuid import UUID

        embedding = _embedder.embed(content)
        _vector_store.index(
            user_id=UUID(user_id),
            character_id=UUID(character_id),
            message_id=UUID(message_id),
            content=content,
            role=role,
            embedding=embedding,
        )
    except Exception:
        pass  # Non-critical: don't fail the request over embedding errors


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    character_id: Optional[UUID] = Query(None),
    archived: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Conversation).where(Conversation.user_id == current_user.id)
    if character_id:
        stmt = stmt.where(Conversation.character_id == character_id)
    if archived is not None:
        stmt = stmt.where(Conversation.is_archived == archived)
    stmt = stmt.order_by(Conversation.updated_at.desc())
    result = await db.execute(stmt)
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = Conversation(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse.model_validate(conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    conversation_id: UUID,
    payload: MessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    message = Message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role=payload.role,
        content=payload.content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    background_tasks.add_task(
        _index_message_for_memory,
        user_id=str(current_user.id),
        character_id=str(conversation.character_id),
        message_id=str(message.id),
        content=payload.content,
        role=payload.role,
    )

    return MessageResponse.model_validate(message)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conversation, field, value)

    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    await db.commit()
    return None


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: UUID,
    token: str = Query(...),
):
    """Bi-directional WebSocket for real-time chat in a conversation.

    Authenticates via `token` query parameter. Once connected, clients can
    send JSON messages and receive real-time broadcasts from other participants.

    Client → Server:  {"role": "user", "content": "Hello"}
    Server → Client:  {"type": "message_created", "message": {...}}
    Server → Client:  {"type": "user_joined", "user_id": "...", "display_name": "..."}
    Server → Client:  {"type": "user_left", "user_id": "...", "display_name": "..."}
    Server → Client:  {"type": "error", "detail": "..."}
    """
    async with async_session_maker() as db:
        try:
            current_user = await get_current_user_ws(token, db)
        except ValueError as exc:
            await websocket.close(code=4001, reason=str(exc))
            return

        result = await db.execute(
            select(Conversation).where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == current_user.id,
                )
            )
        )
        conversation = result.scalar_one_or_none()
        if conversation is None:
            await websocket.close(code=4004, reason="Conversation not found")
            return

        await manager.connect(
            conversation_id=conversation_id,
            websocket=websocket,
            user_id=current_user.id,
            display_name=current_user.display_name,
        )

        try:
            while True:
                raw = await websocket.receive_text()

                try:
                    data = json.loads(raw)
                    msg_in = WSMessageIn.model_validate(data)
                except Exception:
                    await manager.send_error(websocket, "Invalid message format")
                    continue

                message = Message(
                    conversation_id=conversation_id,
                    user_id=current_user.id,
                    role=msg_in.role,
                    content=msg_in.content,
                )
                db.add(message)
                await db.commit()
                await db.refresh(message)

                response = MessageResponse.model_validate(message)
                await manager.broadcast_message(
                    conversation_id=conversation_id,
                    message=response,
                )

                _index_message_for_memory(
                    user_id=str(current_user.id),
                    character_id=str(conversation.character_id),
                    message_id=str(message.id),
                    content=msg_in.content,
                    role=msg_in.role,
                )

        except WebSocketDisconnect:
            await manager.disconnect(conversation_id, websocket)
        except Exception:
            await manager.disconnect(conversation_id, websocket)
