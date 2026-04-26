from __future__ import annotations

from app.schemas.model_gateway import CompatMediaTemplate


def _validate_path(path: str, field: str) -> str | None:
    trimmed = (path or "").strip()
    if not trimmed:
        return f"{field}: path must be non-empty"
    if trimmed.startswith("http://") or trimmed.startswith("https://") or trimmed.startswith("/"):
        return None
    return f"{field}: path must be absolute URL or relative path"


def validate_compat_media_template(template: CompatMediaTemplate) -> None:
    issues: list[str] = []
    for field_name, endpoint in (("create", template.create), ("status", template.status), ("content", template.content)):
        if endpoint is None:
            continue
        issue = _validate_path(endpoint.path, field_name)
        if issue:
            issues.append(issue)
    if template.mode == "async" and template.status is None:
        issues.append("status: async template requires status endpoint")
    if issues:
        raise ValueError("; ".join(issues))
