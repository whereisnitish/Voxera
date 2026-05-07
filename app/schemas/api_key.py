from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.db.models import ProviderKind


class ApiKeyCreate(BaseModel):
    kind: ProviderKind
    provider: str
    api_key: str
    label: str | None = None
    extra: dict | None = None


class ApiKeyUpdate(BaseModel):
    api_key: str | None = None
    label: str | None = None
    extra: dict | None = None


class ApiKeyRead(BaseModel):
    """Public view — never exposes the encrypted key."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: ProviderKind
    provider: str
    label: str | None
    extra: dict | None
    created_at: datetime
