from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.models import User
from app.schemas import ExternalInferenceRequest, InferenceRequest

router = APIRouter()
settings = get_settings()


def _join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _model_ids(data: dict[str, Any]) -> list[str]:
    models = data.get("data", [])
    if not isinstance(models, list):
        return []
    return [
        model["id"]
        for model in models
        if isinstance(model, dict) and isinstance(model.get("id"), str) and model["id"]
    ]


async def fetch_internal_model_ids() -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_join_url(settings.internal_inference_url, "/v1/models"))
            if response.status_code != 200:
                return []
            return _model_ids(response.json())
    except Exception:
        return []


def _messages(payload: InferenceRequest) -> list[dict[str, str]]:
    if payload.messages:
        return [message.model_dump() for message in payload.messages]
    return [{"role": "user", "content": payload.prompt or ""}]


def _openai_payload(payload: InferenceRequest, default_model: str) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": payload.model or default_model,
        "messages": _messages(payload),
        "stream": payload.stream,
    }
    if payload.temperature is not None:
        body["temperature"] = payload.temperature
    if payload.max_tokens is not None:
        body["max_tokens"] = payload.max_tokens
    return body


def _anthropic_payload(payload: InferenceRequest) -> dict[str, Any]:
    system_parts: list[str] = []
    messages: list[dict[str, str]] = []

    for message in _messages(payload):
        if message["role"] == "system":
            system_parts.append(message["content"])
            continue
        messages.append({"role": message["role"], "content": message["content"]})

    if not messages:
        messages.append({"role": "user", "content": payload.prompt or "\n\n".join(system_parts)})

    body: dict[str, Any] = {
        "model": payload.model or settings.external_anthropic_default_model,
        "messages": messages,
        "max_tokens": payload.max_tokens or 1024,
        "stream": payload.stream,
    }
    if system_parts:
        body["system"] = "\n\n".join(system_parts)
    if payload.temperature is not None:
        body["temperature"] = payload.temperature
    return body


def _upstream_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Inference service rejected the request",
    )


async def _json_response(url: str, body: dict[str, Any], headers: dict[str, str]) -> JSONResponse:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=body, headers=headers)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Inference service is unavailable",
        )

    if response.status_code >= 400:
        raise _upstream_error()

    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Inference service returned invalid JSON",
        )
    return JSONResponse(payload)


async def _stream_response(url: str, body: dict[str, Any], headers: dict[str, str]) -> StreamingResponse:
    client = httpx.AsyncClient(timeout=None)
    try:
        request = client.build_request("POST", url, json=body, headers=headers)
        response = await client.send(request, stream=True)
    except httpx.HTTPError:
        await client.aclose()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Inference service is unavailable",
        )

    if response.status_code >= 400:
        await response.aclose()
        await client.aclose()
        raise _upstream_error()

    async def chunks():
        try:
            async for chunk in response.aiter_bytes():
                yield chunk
        finally:
            await response.aclose()
            await client.aclose()

    media_type = response.headers.get("content-type", "text/event-stream")
    return StreamingResponse(chunks(), media_type=media_type)


async def _forward_openai_compatible(
    *,
    url: str,
    body: dict[str, Any],
    headers: dict[str, str] | None = None,
    stream: bool,
):
    request_headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream" if stream else "application/json",
        **(headers or {}),
    }
    if stream:
        return await _stream_response(url, body, request_headers)
    return await _json_response(url, body, request_headers)


@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    del current_user
    return {"models": await fetch_internal_model_ids(), "version": "0.1.0"}


@router.post("/chat/completions")
async def create_chat_completion(
    payload: InferenceRequest,
    current_user: User = Depends(get_current_user),
):
    del current_user
    body = _openai_payload(payload, settings.internal_inference_default_model)
    return await _forward_openai_compatible(
        url=_join_url(settings.internal_inference_url, "/v1/chat/completions"),
        body=body,
        stream=payload.stream,
    )


@router.post("/external/chat/completions")
async def create_external_chat_completion(
    payload: ExternalInferenceRequest,
    current_user: User = Depends(get_current_user),
):
    del current_user
    api_key = payload.api_key.strip()

    if payload.provider == "openai":
        body = _openai_payload(payload, settings.external_openai_default_model)
        return await _forward_openai_compatible(
            url=_join_url(settings.external_openai_url, "/v1/chat/completions"),
            body=body,
            headers={"Authorization": f"Bearer {api_key}"},
            stream=payload.stream,
        )

    body = _anthropic_payload(payload)
    return await _forward_openai_compatible(
        url=_join_url(settings.external_anthropic_url, "/v1/messages"),
        body=body,
        headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        stream=payload.stream,
    )
