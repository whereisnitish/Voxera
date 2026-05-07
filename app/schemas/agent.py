from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AgentBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    system_prompt: str = Field(min_length=1)
    stt_provider: str = "deepgram"
    tts_provider: str = "elevenlabs"
    telephony_provider: str = "twilio"
    llm_model: str = "gpt-4o-mini"
    voice_id: str | None = None
    language: str = "en"
    greeting: str | None = None
    settings: dict | None = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: str | None = None
    system_prompt: str | None = None
    stt_provider: str | None = None
    tts_provider: str | None = None
    telephony_provider: str | None = None
    llm_model: str | None = None
    voice_id: str | None = None
    language: str | None = None
    greeting: str | None = None
    settings: dict | None = None
    is_active: bool | None = None


class AgentRead(AgentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
