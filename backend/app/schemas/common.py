from pydantic import BaseModel, ConfigDict


class ApiSuccessResponse(BaseModel):
    success: bool = True
    data: dict


class ErrorPayload(BaseModel):
    message: str
    details: list[dict] | None = None


class ApiErrorResponse(BaseModel):
    success: bool = False
    error: ErrorPayload


class TimestampedModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
