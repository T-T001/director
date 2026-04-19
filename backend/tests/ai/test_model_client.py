"""Verify that ModelClient sends requests to base_url + request_path verbatim,
which is the whole point of the per-model request_path feature."""

from __future__ import annotations

import json

import httpx
import pytest

from app.ai.model_client import ModelClient, ResolvedModel


def _resolved(path: str, capability: str = "chat", **kwargs) -> ResolvedModel:
    return ResolvedModel(
        model_id="test-model",
        base_url="https://relay.example.com",
        api_key="sk-test",
        request_path=path,
        capability=capability,
        extra_headers=kwargs.get("extra_headers", {}),
        default_params=kwargs.get("default_params", {}),
    )


@pytest.mark.asyncio
async def test_chat_hits_exact_request_path(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    transport = httpx.MockTransport(handler)

    def mk_client(*args, **kwargs):
        return httpx.AsyncClient(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    client = ModelClient(retries=0)
    model = _resolved("/v1/chat/completions")
    result = await client.chat(model, messages=[{"role": "user", "content": "hi"}])

    assert captured["url"] == "https://relay.example.com/v1/chat/completions"
    assert captured["auth"] == "Bearer sk-test"
    assert captured["body"]["model"] == "test-model"
    assert result["choices"][0]["message"]["content"] == "ok"


@pytest.mark.asyncio
async def test_image_uses_custom_path_for_nanobanana(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"data": [{"b64_json": "xxx"}]})

    transport = httpx.MockTransport(handler)

    def mk_client(*args, **kwargs):
        return httpx.AsyncClient(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    client = ModelClient(retries=0)
    model = ResolvedModel(
        model_id="nanobanana",
        base_url="https://relay.example.com/",
        api_key="sk-test",
        request_path="/v2/nanobanana/generate",
        capability="image",
    )
    await client.image(model, prompt="an apple", size="1024x1024")

    assert captured["url"] == "https://relay.example.com/v2/nanobanana/generate"
    assert captured["body"]["model"] == "nanobanana"
    assert captured["body"]["size"] == "1024x1024"


@pytest.mark.asyncio
async def test_extra_headers_are_sent(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["x_custom"] = request.headers.get("x-custom")
        return httpx.Response(200, json={})

    transport = httpx.MockTransport(handler)

    def mk_client(*args, **kwargs):
        return httpx.AsyncClient(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    client = ModelClient(retries=0)
    model = _resolved("/v1/chat/completions", extra_headers={"X-Custom": "abc"})
    await client.chat(model, messages=[{"role": "user", "content": "hi"}])

    assert captured["x_custom"] == "abc"
