from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.db.models import CallDirection, CallStatus, TranscriptRole


class TranscriptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: TranscriptRole
    text: str
    sequence: int
    is_final: bool
    timestamp_ms: int | None
    created_at: datetime


class CallRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    direction: CallDirection
    status: CallStatus
    external_call_id: str | None
    from_number: str | None
    to_number: str | None
    started_at: datetime | None
    ended_at: datetime | None
    duration_seconds: float | None
    cost_usd: float | None
    created_at: datetime


class OutboundCallCreate(BaseModel):
    agent_id: UUID
    to: str
    from_: str
