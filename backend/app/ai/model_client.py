"""HTTP client for OpenAI-compatible relays with user-configurable request paths.

We intentionally avoid the `openai` SDK because it hard-codes the request path
(`/chat/completions`, `/images/generations`, ...). Users of relay services like
OneAPI often need to point different models at different paths, so we let each
model config carry its own `request_path` and send via httpx directly.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import httpx


class ModelClientError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None, url: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.url = url


@dataclass
class ResolvedModel:
    model_id: str
    base_url: str
    api_key: str
    request_path: str
    capability: str
    extra_headers: dict[str, str] = field(default_factory=dict)
    default_params: dict[str, Any] = field(default_factory=dict)

    @property
    def full_url(self) -> str:
        base = self.base_url.rstrip("/")
        path = self.request_path if self.request_path.startswith("/") else "/" + self.request_path
        return base + path


def _build_headers(model: ResolvedModel) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if model.api_key:
        headers["Authorization"] = f"Bearer {model.api_key}"
    headers.update(model.extra_headers or {})
    return headers


class ModelClient:
    """Minimal, path-agnostic client. All methods POST JSON to model.full_url."""

    def __init__(self, *, timeout: float = 60.0, stream_timeout: float = 300.0, retries: int = 2):
        self.timeout = timeout
        self.stream_timeout = stream_timeout
        self.retries = retries

    async def _post_json(self, model: ResolvedModel, payload: dict[str, Any]) -> dict[str, Any]:
        url = model.full_url
        last_exc: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload, headers=_build_headers(model))
                if resp.status_code >= 400:
                    raise ModelClientError(
                        f"upstream {resp.status_code}: {resp.text[:500]}",
                        status_code=resp.status_code,
                        url=url,
                    )
                return resp.json()
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = exc
                if attempt < self.retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    continue
                raise ModelClientError(f"network error: {exc}", url=url) from exc
        raise ModelClientError(f"failed after retries: {last_exc}", url=url)

    async def chat(
        self,
        model: ResolvedModel,
        messages: list[dict[str, Any]],
        *,
        temperature: float | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"model": model.model_id, "messages": messages}
        if model.default_params:
            payload.update(model.default_params)
        if temperature is not None:
            payload["temperature"] = temperature
        if extra:
            payload.update(extra)
        payload.setdefault("stream", False)
        return await self._post_json(model, payload)

    async def chat_stream(
        self,
        model: ResolvedModel,
        messages: list[dict[str, Any]],
        *,
        temperature: float | None = None,
        extra: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        payload: dict[str, Any] = {"model": model.model_id, "messages": messages, "stream": True}
        if model.default_params:
            payload.update({k: v for k, v in model.default_params.items() if k != "stream"})
        if temperature is not None:
            payload["temperature"] = temperature
        if extra:
            payload.update(extra)
        url = model.full_url
        async with httpx.AsyncClient(timeout=self.stream_timeout) as client:
            async with client.stream(
                "POST", url, json=payload, headers=_build_headers(model)
            ) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    raise ModelClientError(
                        f"upstream {resp.status_code}: {body[:500]!r}",
                        status_code=resp.status_code,
                        url=url,
                    )
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue

    async def image(
        self,
        model: ResolvedModel,
        prompt: str,
        *,
        size: str | None = None,
        response_format: str = "b64_json",
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model.model_id,
            "prompt": prompt,
            "response_format": response_format,
        }
        if model.default_params:
            payload.update(model.default_params)
        if size:
            payload["size"] = size
        if extra:
            payload.update(extra)
        return await self._post_json(model, payload)

    async def tts(
        self,
        model: ResolvedModel,
        text: str,
        *,
        voice: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"model": model.model_id, "input": text}
        if voice:
            payload["voice"] = voice
        if model.default_params:
            payload.update(model.default_params)
        if extra:
            payload.update(extra)
        return await self._post_json(model, payload)
