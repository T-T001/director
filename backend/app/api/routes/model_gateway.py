from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.db import get_db
from app.db.models.user import User
from app.schemas.model_gateway import (
    Capability,
    ModelConfigCreate,
    ModelConfigRead,
    ModelConfigUpdate,
    ProviderCreate,
    ProviderRead,
    ProviderUpdate,
)
from app.services.model_gateway_service import ModelGatewayService

router = APIRouter(tags=["model-gateway"])


# ---------- providers ----------


@router.get("/providers")
def list_providers(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    service = ModelGatewayService(db)
    items = service.list_providers(current_user.id)
    return {
        "success": True,
        "data": {
            "providers": [ProviderRead.model_validate(item).model_dump() for item in items]
        },
    }


@router.post("/providers")
def create_provider(
    payload: ProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    provider = service.create_provider(current_user.id, payload)
    return {
        "success": True,
        "data": {"provider": ProviderRead.model_validate(provider).model_dump()},
    }


@router.patch("/providers/{provider_id}")
def update_provider(
    provider_id: str,
    payload: ProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    provider = service.update_provider(current_user.id, provider_id, payload)
    return {
        "success": True,
        "data": {"provider": ProviderRead.model_validate(provider).model_dump()},
    }


@router.delete("/providers/{provider_id}")
def delete_provider(
    provider_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    service.delete_provider(current_user.id, provider_id)
    return {"success": True, "data": {"deleted": True}}


# ---------- models ----------


@router.get("/models")
def list_models(
    capability: Capability | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    items = service.list_models(current_user.id, capability)
    return {
        "success": True,
        "data": {"models": [ModelConfigRead.model_validate(service.model_to_read_dict(m)).model_dump() for m in items]},
    }


@router.post("/models")
def create_model(
    payload: ModelConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    model = service.create_model(current_user.id, payload)
    return {
        "success": True,
        "data": {"model": ModelConfigRead.model_validate(service.model_to_read_dict(model)).model_dump()},
    }


@router.patch("/models/{model_id}")
def update_model(
    model_id: str,
    payload: ModelConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    model = service.update_model(current_user.id, model_id, payload)
    return {
        "success": True,
        "data": {"model": ModelConfigRead.model_validate(service.model_to_read_dict(model)).model_dump()},
    }


@router.delete("/models/{model_id}")
def delete_model(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    service.delete_model(current_user.id, model_id)
    return {"success": True, "data": {"deleted": True}}


@router.post("/models/{model_id}/test")
async def test_model(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    service = ModelGatewayService(db)
    result = await service.test_model(current_user.id, model_id)
    return {"success": result["success"], "data": result}
