"""HTTP client for OpenAI-compatible relays with user-configurable request paths.

We intentionally avoid the `openai` SDK because it hard-codes the request path
(`/chat/completions`, `/images/generations`, ...). Users of relay services like
OneAPI often need to point different models at different paths, so we let each
model config carry its own `request_path` and send via httpx directly.
"""

from __future__ import annotations

import asyncio
import base64
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
    protocol: str = "openai"
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


def _is_openai_responses_path(request_path: str) -> bool:
    normalized = (request_path or "").rstrip("/").lower()
    return normalized.endswith("/responses") or normalized == "/responses"


def _normalize_response(model: ResolvedModel, response: Any) -> dict[str, Any]:
    protocol = (model.protocol or "openai").lower()
    if protocol == "anthropic" and isinstance(response, dict):
        blocks = response.get("content") or []
        text_parts = []
        for block in blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                text_parts.append(str(block.get("text") or ""))
        return {
            "id": response.get("id"),
            "choices": [{"message": {"role": "assistant", "content": "\n".join(text_parts).strip()}}],
            "raw": response,
        }
    if protocol == "gemini" and isinstance(response, dict):
        candidates = response.get("candidates") or []
        text_parts = []
        if candidates:
            content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
            parts = content.get("parts") if isinstance(content, dict) else []
            for part in parts or []:
                if isinstance(part, dict) and "text" in part:
                    text_parts.append(str(part.get("text") or ""))
        return {
            "choices": [{"message": {"role": "assistant", "content": "\n".join(text_parts).strip()}}],
            "raw": response,
        }
    if protocol == "openai" and _is_openai_responses_path(model.request_path) and isinstance(response, dict):
        output = response.get("output") or []
        text_parts = []
        for item in output:
            if not isinstance(item, dict):
                continue
            for content in item.get("content") or []:
                if isinstance(content, dict) and "text" in content:
                    text_parts.append(str(content.get("text") or ""))
        return {
            "id": response.get("id"),
            "choices": [{"message": {"role": "assistant", "content": "\n".join(text_parts).strip()}}],
            "raw": response,
        }
    return response if isinstance(response, dict) else {"raw": response}


def _normalize_audio_response(response: httpx.Response) -> dict[str, Any]:
    content_type = response.headers.get("content-type", "audio/mpeg").split(";")[0].strip()
    return {
        "audio": base64.b64encode(response.content).decode("utf-8"),
        "mime_type": content_type or "audio/mpeg",
    }


def _build_request(model: ResolvedModel, payload: dict[str, Any]) -> tuple[str, dict[str, str], dict[str, Any]]:
    protocol = (model.protocol or "openai").lower()
    url = model.full_url
    headers: dict[str, str] = {"Content-Type": "application/json"}
    body = dict(payload)

    if protocol == "anthropic":
        if model.api_key:
            headers["x-api-key"] = model.api_key
        headers.setdefault("anthropic-version", "2023-06-01")
        if "messages" in body:
            body = {
                "model": model.model_id,
                "messages": body.get("messages", []),
                "max_tokens": body.get("max_tokens", body.get("max_output_tokens", 1024)),
            }
            if "temperature" in payload:
                body["temperature"] = payload["temperature"]
    elif protocol == "gemini":
        if model.api_key:
            headers["x-goog-api-key"] = model.api_key
        if "messages" in body:
            original_body = dict(body)
            user_text = []
            system_text = []
            for message in original_body.get("messages", []):
                if not isinstance(message, dict):
                    continue
                content = message.get("content")
                if isinstance(content, list):
                    text = "\n".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
                else:
                    text = str(content or "")
                if message.get("role") == "system":
                    system_text.append(text)
                else:
                    user_text.append(text)
            merged_text = "\n\n".join(part for part in ["\n".join(system_text), "\n".join(user_text)] if part)
            body = {
                "contents": [{"parts": [{"text": merged_text or "hi"}]}],
            }
            generation_config: dict[str, Any] = {}
            if "temperature" in original_body:
                generation_config["temperature"] = original_body["temperature"]
            max_tokens = original_body.get("max_output_tokens", original_body.get("max_tokens"))
            if max_tokens is not None:
                generation_config["maxOutputTokens"] = max_tokens
            if generation_config:
                body["generationConfig"] = generation_config
        else:
            body.setdefault("contents", [{"parts": [{"text": "hi"}]}])
    else:
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        if protocol == "openai" and _is_openai_responses_path(model.request_path):
            input_items = body.get("input")
            if input_items is None and "messages" in body:
                input_items = []
                for message in body.get("messages", []):
                    if not isinstance(message, dict):
                        continue
                    role = str(message.get("role") or "user")
                    content = message.get("content")
                    if isinstance(content, list):
                        text = "\n".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
                    else:
                        text = str(content or "")
                    input_items.append(
                        {
                            "role": role,
                            "content": [{"type": "input_text", "text": text}],
                        }
                    )
            body = {
                "model": model.model_id,
                "input": input_items or [{"role": "user", "content": [{"type": "input_text", "text": "ping"}]}],
            }
            max_output_tokens = payload.get("max_output_tokens", payload.get("max_tokens"))
            if max_output_tokens is not None:
                body["max_output_tokens"] = max_output_tokens
            if "temperature" in payload:
                body["temperature"] = payload["temperature"]

    if model.extra_headers:
        headers.update(model.extra_headers)
    return url, headers, body


# --- protocol-specific request builders for the ping/test path ---


def _build_ping_request(model: ResolvedModel) -> tuple[str, dict[str, str], dict[str, Any]]:
    """Return (url, headers, json_payload) for a minimal connectivity check.

    Each protocol uses its own auth convention and a small but valid body so the
    upstream doesn't 400 purely on shape. A 200/201 means the request went
    through end-to-end; a non-200 status is returned faithfully so the UI can
    show the user what's wrong (401 = auth, 404 = path, etc.).
    """
    protocol = (model.protocol or "openai").lower()
    url = model.full_url
    headers: dict[str, str] = {"Content-Type": "application/json"}
    payload: dict[str, Any] = {}

    if protocol == "anthropic":
        if model.api_key:
            headers["x-api-key"] = model.api_key
        headers.setdefault("anthropic-version", "2023-06-01")
        payload = {
            "model": model.model_id,
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "hi"}],
        }
    elif protocol == "gemini":
        if model.api_key:
            headers["x-goog-api-key"] = model.api_key
        payload = {
            "contents": [{"parts": [{"text": "你好"}]}],
        }
    elif protocol == "openai-image":
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        payload = {
            "model": model.model_id,
            "prompt": "a red circle",
            "n": 1,
            "size": "1024x1024",
        }
    elif protocol == "openai-tts":
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        payload = {
            "model": model.model_id,
            "input": "hello",
            "voice": "alloy",
        }
    elif protocol == "openai-embedding":
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        payload = {"model": model.model_id, "input": "hello"}
    elif protocol == "raw":
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        payload = {"model": model.model_id} if model.model_id else {}
    else:  # default "openai"
        if model.api_key:
            headers["Authorization"] = f"Bearer {model.api_key}"
        if _is_openai_responses_path(model.request_path):
            payload = {
                "model": model.model_id,
                "input": [
                    {
                        "role": "user",
                        "content": [{"type": "input_text", "text": "ping"}],
                    }
                ],
                "max_output_tokens": 8,
                "temperature": 0,
            }
        else:
            payload = {
                "model": model.model_id,
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 20,
                "temperature": 0,
                "stream": False,
            }

    if model.extra_headers:
        headers.update(model.extra_headers)
    if model.default_params:
        payload = {**payload, **model.default_params}

    return url, headers, payload


class ModelClient:
    """Minimal, path-agnostic client. All workflow methods POST JSON to model.full_url."""

    def __init__(self, *, timeout: float = 60.0, stream_timeout: float = 300.0, retries: int = 2):
        self.timeout = timeout
        self.stream_timeout = stream_timeout
        self.retries = retries

    async def _post_json(self, model: ResolvedModel, payload: dict[str, Any]) -> dict[str, Any]:
        url, headers, body = _build_request(model, payload)
        last_exc: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=body, headers=headers)
                if resp.status_code >= 400:
                    raise ModelClientError(
                        f"upstream {resp.status_code}: {resp.text[:500]}",
                        status_code=resp.status_code,
                        url=url,
                    )
                try:
                    data = resp.json()
                except Exception as exc:
                    raise ModelClientError(f"invalid json response: {exc}", url=url) from exc
                return _normalize_response(model, data)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = exc
                if attempt < self.retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    continue
                raise ModelClientError(f"network error: {exc}", url=url) from exc
        raise ModelClientError(f"failed after retries: {last_exc}", url=url)

    async def ping(self, model: ResolvedModel) -> dict[str, Any]:
        """Protocol-aware connectivity test.

        Returns a structured dict so the caller (test endpoint) can surface the
        raw HTTP result to the user.
        """
        url, headers, payload = _build_ping_request(model)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            return {
                "success": False,
                "request_url": url,
                "status_code": None,
                "response_preview": None,
                "error": f"network error: {exc}",
            }

        try:
            body = resp.json()
            preview = json.dumps(body, ensure_ascii=False)[:500]
        except Exception:
            try:
                text = resp.text
                preview = text[:500] if text else f"<empty body, {len(resp.content)} bytes>"
            except Exception:
                preview = f"<binary {len(resp.content)} bytes>"

        ok = resp.status_code < 400
        return {
            "success": ok,
            "request_url": url,
            "status_code": resp.status_code,
            "response_preview": preview,
            "error": None if ok else f"HTTP {resp.status_code}",
        }

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
        if model.protocol == "anthropic":
            payload.setdefault("max_tokens", 1024)
        elif model.protocol == "gemini":
            payload.setdefault("max_output_tokens", 1024)
        return await self._post_json(model, payload)

    async def chat_stream(
        self,
        model: ResolvedModel,
        messages: list[dict[str, Any]],
        *,
        temperature: float | None = None,
        extra: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        if (model.protocol or "openai").lower() != "openai":
            raise ModelClientError("streaming is currently only supported for openai-compatible models")
        payload: dict[str, Any] = {"model": model.model_id, "messages": messages, "stream": True}
        if model.default_params:
            payload.update({k: v for k, v in model.default_params.items() if k != "stream"})
        if temperature is not None:
            payload["temperature"] = temperature
        if extra:
            payload.update(extra)
        url, headers, body = _build_request(model, payload)
        async with httpx.AsyncClient(timeout=self.stream_timeout) as client:
            async with client.stream("POST", url, json=body, headers=headers) as resp:
                if resp.status_code >= 400:
                    body_bytes = await resp.aread()
                    raise ModelClientError(
                        f"upstream {resp.status_code}: {body_bytes[:500]!r}",
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

        if (model.protocol or "openai").lower() == "openai-tts":
            url, headers, body = _build_request(model, payload)
            last_exc: Exception | None = None
            for attempt in range(self.retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        resp = await client.post(url, json=body, headers=headers)
                    if resp.status_code >= 400:
                        raise ModelClientError(
                            f"upstream {resp.status_code}: {resp.text[:500]}",
                            status_code=resp.status_code,
                            url=url,
                        )
                    return _normalize_audio_response(resp)
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_exc = exc
                    if attempt < self.retries:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue
                    raise ModelClientError(f"network error: {exc}", url=url) from exc
            raise ModelClientError(f"failed after retries: {last_exc}", url=url)

        return await self._post_json(model, payload)
