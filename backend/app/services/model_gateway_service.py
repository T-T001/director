import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai import ModelClient, ModelClientError, ResolvedModel
from app.core.crypto import decrypt, encrypt
from app.db.models.model_gateway import ModelConfig, ModelProvider
from app.schemas.model_gateway import (
    ModelConfigCreate,
    ModelConfigUpdate,
    ProviderCreate,
    ProviderUpdate,
)


def _provider_to_dict(provider: ModelProvider) -> dict[str, Any]:
    return {
        "id": provider.id,
        "name": provider.name,
        "base_url": provider.base_url,
        "api_type": provider.api_type or "openai",
        "has_api_key": bool(provider.api_key_encrypted),
        "created_at": provider.created_at,
        "updated_at": provider.updated_at,
    }


class ModelGatewayService:
    def __init__(self, db: Session):
        self.db = db

    # ---------- providers ----------

    def list_providers(self, user_id: str) -> list[dict[str, Any]]:
        rows = (
            self.db.query(ModelProvider)
            .filter(ModelProvider.user_id == user_id)
            .order_by(ModelProvider.created_at.desc())
            .all()
        )
        return [_provider_to_dict(p) for p in rows]

    def create_provider(self, user_id: str, payload: ProviderCreate) -> dict[str, Any]:
        provider = ModelProvider(
            user_id=user_id,
            name=payload.name.strip(),
            base_url=payload.base_url.strip(),
            api_type=payload.api_type or "openai",
            api_key_encrypted=encrypt(payload.api_key) if payload.api_key else "",
        )
        self.db.add(provider)
        self.db.commit()
        self.db.refresh(provider)
        return _provider_to_dict(provider)

    def get_provider(self, user_id: str, provider_id: str) -> ModelProvider:
        provider = (
            self.db.query(ModelProvider)
            .filter(ModelProvider.id == provider_id, ModelProvider.user_id == user_id)
            .first()
        )
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Provider not found"}
            )
        return provider

    def update_provider(
        self, user_id: str, provider_id: str, payload: ProviderUpdate
    ) -> dict[str, Any]:
        provider = self.get_provider(user_id, provider_id)
        if payload.name is not None:
            provider.name = payload.name.strip()
        if payload.base_url is not None:
            provider.base_url = payload.base_url.strip()
        if payload.api_type is not None:
            provider.api_type = payload.api_type
        if payload.api_key is not None:
            provider.api_key_encrypted = encrypt(payload.api_key) if payload.api_key else ""
        self.db.commit()
        self.db.refresh(provider)
        return _provider_to_dict(provider)

    def delete_provider(self, user_id: str, provider_id: str) -> None:
        provider = self.get_provider(user_id, provider_id)
        self.db.delete(provider)
        self.db.commit()

    # ---------- models ----------

    def list_models(
        self, user_id: str, capability: str | None = None
    ) -> list[ModelConfig]:
        q = self.db.query(ModelConfig).filter(ModelConfig.user_id == user_id)
        if capability:
            q = q.filter(ModelConfig.capability == capability)
        return q.order_by(ModelConfig.created_at.desc()).all()

    def get_model(self, user_id: str, model_id: str) -> ModelConfig:
        model = (
            self.db.query(ModelConfig)
            .filter(ModelConfig.id == model_id, ModelConfig.user_id == user_id)
            .first()
        )
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Model not found"}
            )
        return model

    def create_model(self, user_id: str, payload: ModelConfigCreate) -> ModelConfig:
        self.get_provider(user_id, payload.provider_id)
        model = ModelConfig(
            user_id=user_id,
            provider_id=payload.provider_id,
            model_id=payload.model_id.strip(),
            display_name=payload.display_name,
            capability=payload.capability,
            protocol=payload.protocol or "openai",
            enabled=payload.enabled if payload.enabled is not None else True,
            request_path=payload.request_path.strip(),
            extra_headers=payload.extra_headers,
            default_params=payload.default_params,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update_model(
        self, user_id: str, model_id: str, payload: ModelConfigUpdate
    ) -> ModelConfig:
        model = self.get_model(user_id, model_id)
        data = payload.model_dump(exclude_unset=True)
        for field_name, value in data.items():
            if isinstance(value, str) and field_name in {"model_id", "request_path"}:
                value = value.strip()
            setattr(model, field_name, value)
        self.db.commit()
        self.db.refresh(model)
        return model

    def delete_model(self, user_id: str, model_id: str) -> None:
        model = self.get_model(user_id, model_id)
        self.db.delete(model)
        self.db.commit()

    # ---------- resolve ----------

    def resolve(self, user_id: str, model_id: str) -> ResolvedModel:
        model = self.get_model(user_id, model_id)
        provider = self.get_provider(user_id, model.provider_id)
        api_key = decrypt(provider.api_key_encrypted) if provider.api_key_encrypted else ""
        extra_headers: dict[str, str] = {}
        if model.extra_headers:
            try:
                parsed = json.loads(model.extra_headers)
                if isinstance(parsed, dict):
                    extra_headers = {str(k): str(v) for k, v in parsed.items()}
            except json.JSONDecodeError:
                pass
        default_params: dict[str, Any] = {}
        if model.default_params:
            try:
                parsed = json.loads(model.default_params)
                if isinstance(parsed, dict):
                    default_params = parsed
            except json.JSONDecodeError:
                pass
        return ResolvedModel(
            model_id=model.model_id,
            base_url=provider.base_url,
            api_key=api_key,
            request_path=model.request_path,
            capability=model.capability,
            protocol=(model.protocol or "openai"),
            extra_headers=extra_headers,
            default_params=default_params,
        )

    async def test_model(self, user_id: str, model_id: str) -> dict[str, Any]:
        resolved = self.resolve(user_id, model_id)
        client = ModelClient(timeout=30.0, retries=0)
        try:
            return await client.ping(resolved)
        except ModelClientError as exc:
            return {
                "success": False,
                "request_url": exc.url or resolved.full_url,
                "status_code": exc.status_code,
                "response_preview": None,
                "error": str(exc),
            }
