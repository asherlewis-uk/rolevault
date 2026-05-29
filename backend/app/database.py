from collections.abc import AsyncGenerator
from uuid import UUID

from sqlalchemy import MetaData, event, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
    connect_args={
        "server_settings": {"search_path": "rolevault"},
    },
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

rolevault_metadata = MetaData(schema="rolevault")


class Base(DeclarativeBase):
    metadata = rolevault_metadata


def _apply_rls_context(session: Session, connection: Connection) -> None:
    if connection.dialect.name != "postgresql":
        return

    current_user_id = session.info.get("current_user_id")
    is_service_role = bool(session.info.get("is_service_role"))

    if is_service_role:
        connection.execute(
            text(
                "SELECT "
                "set_config('app.current_user_id', '', true), "
                "set_config('app.is_service_role', 'true', true)"
            )
        )
        return

    if current_user_id:
        connection.execute(
            text(
                "SELECT "
                "set_config('app.current_user_id', :user_id, true), "
                "set_config('app.is_service_role', 'false', true)"
            ),
            {"user_id": str(current_user_id)},
        )
        return

    connection.execute(
        text(
            "SELECT "
            "set_config('app.current_user_id', '', true), "
            "set_config('app.is_service_role', 'false', true)"
        )
    )


@event.listens_for(Session, "after_begin")
def _set_transaction_rls_context(
    session: Session,
    transaction: object,
    connection: Connection,
) -> None:
    _apply_rls_context(session, connection)


def set_current_user_context(session: AsyncSession, user_id: UUID) -> None:
    session.info["current_user_id"] = str(user_id)
    session.info["is_service_role"] = False


def set_service_role_context(session: AsyncSession) -> None:
    session.info["current_user_id"] = None
    session.info["is_service_role"] = True


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
