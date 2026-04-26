"""Verify that ModelClient sends requests to base_url + request_path verbatim,
which is the whole point of the per-model request_path feature."""

from __future__ import annotations

import json

import httpx
import pytest

from app.ai.model_client import ModelClient, ResolvedModel
from app.schemas.model_gateway import CompatMediaTemplate


def _resolved(path: str, capability: str = "chat", **kwargs) -> ResolvedModel:
    return ResolvedModel(
        model_id="test-model",
        base_url="https://relay.example.com",
        api_key="sk-test",
        request_path=path,
        capability=capability,
        extra_headers=kwargs.get("extra_headers", {}),
        default_params=kwargs.get("default_params", {}),
        compat_media_template=kwargs.get("compat_media_template"),
    )


@pytest.mark.anyio
async def test_chat_hits_exact_request_path(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    transport = httpx.MockTransport(handler)

    real_client = httpx.AsyncClient

    def mk_client(*args, **kwargs):
        return real_client(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    client = ModelClient(retries=0)
    model = _resolved("/v1/chat/completions")
    result = await client.chat(model, messages=[{"role": "user", "content": "hi"}])

    assert captured["url"] == "https://relay.example.com/v1/chat/completions"
    assert captured["auth"] == "Bearer sk-test"
    assert captured["body"]["model"] == "test-model"
    assert result["choices"][0]["message"]["content"] == "ok"


@pytest.mark.anyio
async def test_image_uses_custom_path_for_nanobanana(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"data": [{"b64_json": "xxx"}]})

    transport = httpx.MockTransport(handler)

    real_client = httpx.AsyncClient

    def mk_client(*args, **kwargs):
        return real_client(transport=transport, timeout=kwargs.get("timeout", 10))

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


@pytest.mark.anyio
async def test_extra_headers_are_sent(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["x_custom"] = request.headers.get("x-custom")
        return httpx.Response(200, json={})

    transport = httpx.MockTransport(handler)

    real_client = httpx.AsyncClient

    def mk_client(*args, **kwargs):
        return real_client(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    client = ModelClient(retries=0)
    model = _resolved("/v1/chat/completions", extra_headers={"X-Custom": "abc"})
    await client.chat(model, messages=[{"role": "user", "content": "hi"}])

    assert captured["x_custom"] == "abc"


@pytest.mark.anyio
async def test_ping_treats_http_200_business_error_as_failed(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"message": "Unauthorized, invalid access token", "success": False})

    transport = httpx.MockTransport(handler)

    real_client = httpx.AsyncClient

    def mk_client(*args, **kwargs):
        return real_client(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    result = await ModelClient(retries=0).ping(_resolved("/pg/chat/completions", capability="image"))

    assert result["success"] is False
    assert result["status_code"] == 200
    assert result["error"] == "Unauthorized, invalid access token"


@pytest.mark.anyio
async def test_image_uses_compat_template(monkeypatch):
    captured: dict = {}
    template = CompatMediaTemplate.model_validate({
        "version": 1,
        "mediaType": "image",
        "mode": "sync",
        "create": {
            "method": "POST",
            "path": "/images/generations",
            "contentType": "application/json",
            "bodyTemplate": {"model": "{{model}}", "prompt": "{{prompt}}"},
        },
        "response": {"outputUrlPath": "$.data[0].url", "errorPath": "$.error.message"},
    })

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"data": [{"url": "https://img.example.com/a.png"}]})

    transport = httpx.MockTransport(handler)

    real_client = httpx.AsyncClient

    def mk_client(*args, **kwargs):
        return real_client(transport=transport, timeout=kwargs.get("timeout", 10))

    monkeypatch.setattr("app.ai.model_client.httpx.AsyncClient", mk_client)

    result = await ModelClient(retries=0).image(
        _resolved("/ignored", capability="image", compat_media_template=template),
        prompt="banana",
        size="1024x1024",
    )

    assert captured["url"] == "https://relay.example.com/images/generations"
    assert captured["auth"] == "Bearer sk-test"
    assert captured["body"] == {"model": "test-model", "prompt": "banana"}
    assert result["data"][0]["url"] == "https://img.example.com/a.png"
