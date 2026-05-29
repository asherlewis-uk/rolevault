from __future__ import annotations

from types import SimpleNamespace

from app.database import _apply_rls_context, set_current_user_context, set_service_role_context

from conftest import make_user


class FakeConnection:
    def __init__(self, dialect_name: str = "postgresql") -> None:
        self.dialect = SimpleNamespace(name=dialect_name)
        self.calls: list[tuple[str, dict[str, str] | None]] = []

    def execute(self, statement, params=None) -> None:
        self.calls.append((str(statement), params))


class FakeSession:
    def __init__(self) -> None:
        self.info: dict[str, object] = {}


def test_current_user_context_sets_transaction_scoped_rls_user() -> None:
    user = make_user()
    session = FakeSession()
    connection = FakeConnection()

    set_current_user_context(session, user.id)
    _apply_rls_context(session, connection)

    assert session.info == {"current_user_id": str(user.id), "is_service_role": False}
    assert len(connection.calls) == 1
    sql, params = connection.calls[0]
    assert "set_config('app.current_user_id'" in sql
    assert "set_config('app.is_service_role', 'false', true)" in sql
    assert params == {"user_id": str(user.id)}


def test_service_role_context_sets_transaction_scoped_service_flag() -> None:
    session = FakeSession()
    connection = FakeConnection()

    set_service_role_context(session)
    _apply_rls_context(session, connection)

    assert session.info == {"current_user_id": None, "is_service_role": True}
    assert len(connection.calls) == 1
    sql, params = connection.calls[0]
    assert "set_config('app.current_user_id', '', true)" in sql
    assert "set_config('app.is_service_role', 'true', true)" in sql
    assert params is None


def test_rls_context_is_noop_for_non_postgresql_connections() -> None:
    user = make_user()
    session = FakeSession()
    connection = FakeConnection(dialect_name="sqlite")

    set_current_user_context(session, user.id)
    _apply_rls_context(session, connection)

    assert connection.calls == []
