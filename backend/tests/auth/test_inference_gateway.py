from fastapi.responses import JSONResponse

from conftest import FakeAsyncSession

from app.inference import router as inference_router


def test_config_endpoint_does_not_expose_internal_inference_url(monkeypatch, client_factory, user_a):
    async def fake_fetch_internal_model_ids():
        return ["model-a"]

    monkeypatch.setattr("app.config_endpoint.router.fetch_internal_model_ids", fake_fetch_internal_model_ids)
    client = client_factory(db=FakeAsyncSession(), current_user=user_a)

    response = client.get("/api/config")

    assert response.status_code == 200
    assert response.json() == {"models": ["model-a"], "version": "0.1.0"}
    assert "inference_url" not in response.json()


def test_internal_inference_rejects_client_supplied_endpoint_url(client_factory, user_a):
    client = client_factory(db=FakeAsyncSession(), current_user=user_a)

    response = client.post(
        "/api/inference/chat/completions",
        json={
            "prompt": "hello",
            "stream": False,
            "endpoint_url": "https://internal.example.invalid",
        },
    )

    assert response.status_code == 422


def test_internal_inference_forwards_prompt_without_client_endpoint(monkeypatch, client_factory, user_a):
    captured = {}

    async def fake_forward_openai_compatible(*, url, body, headers=None, stream):
        captured["url"] = url
        captured["body"] = body
        captured["headers"] = headers
        captured["stream"] = stream
        return JSONResponse({"ok": True})

    monkeypatch.setattr(inference_router, "_forward_openai_compatible", fake_forward_openai_compatible)
    client = client_factory(db=FakeAsyncSession(), current_user=user_a)

    response = client.post(
        "/api/inference/chat/completions",
        json={"prompt": "hello", "stream": False},
    )

    assert response.status_code == 200
    assert captured["url"].endswith("/v1/chat/completions")
    assert captured["body"]["messages"] == [{"role": "user", "content": "hello"}]
    assert "endpoint_url" not in captured["body"]
    assert captured["headers"] is None
    assert captured["stream"] is False


def test_external_inference_uses_byok_without_leaking_key_to_body(monkeypatch, client_factory, user_a):
    captured = {}

    async def fake_forward_openai_compatible(*, url, body, headers=None, stream):
        captured["url"] = url
        captured["body"] = body
        captured["headers"] = headers
        captured["stream"] = stream
        return JSONResponse({"ok": True})

    monkeypatch.setattr(inference_router, "_forward_openai_compatible", fake_forward_openai_compatible)
    client = client_factory(db=FakeAsyncSession(), current_user=user_a)

    response = client.post(
        "/api/inference/external/chat/completions",
        json={
            "provider": "openai",
            "api_key": "sk-test-000000000000000000000000000000",
            "prompt": "hello",
            "stream": False,
        },
    )

    assert response.status_code == 200
    assert captured["url"].endswith("/v1/chat/completions")
    assert captured["headers"]["Authorization"].startswith("Bearer sk-test-")
    assert "api_key" not in captured["body"]
    assert captured["stream"] is False


def test_external_inference_rejects_provider_supplied_endpoint_url(client_factory, user_a):
    client = client_factory(db=FakeAsyncSession(), current_user=user_a)

    response = client.post(
        "/api/inference/external/chat/completions",
        json={
            "provider": "openai",
            "api_key": "sk-test-000000000000000000000000000000",
            "prompt": "hello",
            "endpoint_url": "https://example.invalid/v1/chat/completions",
        },
    )

    assert response.status_code == 422
