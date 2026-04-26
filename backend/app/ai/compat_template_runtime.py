from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode

import httpx

from app.schemas.model_gateway import CompatMediaTemplate, TemplateEndpoint

TemplateValue = dict[str, Any] | list[Any] | str | int | float | bool | None


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _is_exact_placeholder(value: str) -> str | None:
    stripped = value.strip()
    if stripped.startswith("{{") and stripped.endswith("}}"):
        inner = stripped[2:-2].strip()
        return inner or None
    return None


def _render_value(template: TemplateValue, variables: dict[str, Any]) -> TemplateValue:
    if isinstance(template, str):
        exact = _is_exact_placeholder(template)
        if exact is not None:
            if exact not in variables:
                raise ValueError(f"missing template variable: {exact}")
            return variables[exact]
        rendered = template
        for key, value in variables.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", _stringify(value))
            rendered = rendered.replace(f"{{{{ {key} }}}}", _stringify(value))
        return rendered
    if isinstance(template, list):
        return [_render_value(item, variables) for item in template]
    if isinstance(template, dict):
        return {key: _render_value(value, variables) for key, value in template.items()}
    return template


def _normalize_url(base_url: str, path: str) -> str:
    path = (path or "").strip()
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = base_url.rstrip("/")
    suffix = path if path.startswith("/") else f"/{path}"
    return f"{base}{suffix}"


def _build_headers(api_key: str, default_headers: dict[str, str], endpoint: TemplateEndpoint) -> dict[str, str]:
    headers = dict(default_headers)
    if api_key and "Authorization" not in headers and "authorization" not in {key.lower() for key in headers}:
        headers["Authorization"] = f"Bearer {api_key}"
    if endpoint.headers:
        headers.update(endpoint.headers)
    return headers


def _build_request_parts(
    *,
    base_url: str,
    api_key: str,
    default_headers: dict[str, str],
    endpoint: TemplateEndpoint,
    variables: dict[str, Any],
) -> tuple[str, dict[str, str], dict[str, Any]]:
    url = _normalize_url(base_url, endpoint.path)
    headers = _build_headers(api_key, default_headers, endpoint)
    body = _render_value(endpoint.bodyTemplate, variables)
    content_type = endpoint.contentType or "application/json"

    request_kwargs: dict[str, Any] = {}
    if endpoint.method == "GET":
        if isinstance(body, dict):
            request_kwargs["params"] = body
        elif body is not None:
            raise ValueError("GET template body must render to an object")
        return url, headers, request_kwargs

    if content_type == "application/json":
        headers.setdefault("Content-Type", "application/json")
        request_kwargs["json"] = body
    elif content_type == "application/x-www-form-urlencoded":
        headers["Content-Type"] = content_type
        if body is None:
            request_kwargs["content"] = ""
        elif isinstance(body, dict):
            request_kwargs["content"] = urlencode(body, doseq=True)
        else:
            raise ValueError("urlencoded template body must render to an object")
    elif content_type == "multipart/form-data":
        if body is None:
            request_kwargs["files"] = {}
        elif isinstance(body, dict):
            request_kwargs["files"] = {key: (None, _stringify(value)) for key, value in body.items()}
        else:
            raise ValueError("multipart template body must render to an object")
    else:
        raise ValueError(f"unsupported template content type: {content_type}")

    return url, headers, request_kwargs


def _extract_json_path(payload: Any, path: str | None) -> Any:
    if not path:
        return None
    if not path.startswith("$"):
        return None
    current = payload
    remaining = path[1:]
    while remaining:
        if remaining.startswith("."):
            remaining = remaining[1:]
            next_sep = len(remaining)
            for sep in (".", "["):
                idx = remaining.find(sep)
                if idx != -1:
                    next_sep = min(next_sep, idx)
            key = remaining[:next_sep]
            remaining = remaining[next_sep:]
            if not isinstance(current, dict):
                return None
            current = current.get(key)
            continue
        if remaining.startswith("["):
            end = remaining.find("]")
            if end == -1:
                return None
            token = remaining[1:end]
            remaining = remaining[end + 1 :]
            if not isinstance(current, list):
                return None
            try:
                index = int(token)
            except ValueError:
                return None
            if index < 0 or index >= len(current):
                return None
            current = current[index]
            continue
        return None
    return current


async def execute_template_request(
    *,
    client: httpx.AsyncClient,
    template: CompatMediaTemplate,
    base_url: str,
    api_key: str,
    default_headers: dict[str, str],
    variables: dict[str, Any],
) -> tuple[httpx.Response, str, str | None]:
    url, headers, request_kwargs = _build_request_parts(
        base_url=base_url,
        api_key=api_key,
        default_headers=default_headers,
        endpoint=template.create,
        variables=variables,
    )
    response = await client.request(template.create.method, url, headers=headers, **request_kwargs)
    template_error: str | None = None
    try:
        payload = response.json()
    except Exception:
        payload = None
    if payload is not None:
        error_value = _extract_json_path(payload, template.response.errorPath)
        if error_value:
            template_error = _stringify(error_value)
    return response, url, template_error


def extract_template_outputs(payload: Any, template: CompatMediaTemplate) -> tuple[str | None, str | None]:
    url_value = _extract_json_path(payload, template.response.outputUrlPath)
    urls_value = _extract_json_path(payload, template.response.outputUrlsPath)
    if isinstance(url_value, str) and url_value:
        return url_value, None
    if isinstance(urls_value, list) and urls_value:
        first = urls_value[0]
        if isinstance(first, str):
            return first, None
        if isinstance(first, dict):
            nested_url = first.get("url")
            nested_b64 = first.get("b64_json")
            return nested_url if isinstance(nested_url, str) else None, nested_b64 if isinstance(nested_b64, str) else None
    if isinstance(urls_value, dict):
        nested_url = urls_value.get("url")
        nested_b64 = urls_value.get("b64_json")
        return nested_url if isinstance(nested_url, str) else None, nested_b64 if isinstance(nested_b64, str) else None
    return None, None
