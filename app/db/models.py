import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class ProviderKind(str, enum.Enum):
    stt = "stt"
    tts = "tts"
    telephony = "telephony"
    llm = "llm"


class CallDirection(str, enum.Enum):
    inbound = "inbound"
    outbound = "outbound"


class CallStatus(str, enum.Enum):
    initiated = "initiated"
    ringing = "ringing"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"


class TranscriptRole(str, enum.Enum):
    user = "user"
    agent = "agent"
    system = "system"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    api_keys: Mapped[list["ApiKey"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    agents: Mapped[list["Agent"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class ApiKey(Base, TimestampMixin):
    """User-supplied third-party provider credentials, stored encrypted."""

    __tablename__ = "api_keys"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_api_keys_user_provider"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[ProviderKind] = mapped_column(Enum(ProviderKind), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "deepgram"
    label: Mapped[str | None] = mapped_column(String(128))
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    extra: Mapped[dict | None] = mapped_column(JSON)  # account SID, region, etc.

    user: Mapped[User] = relationship(back_populates="api_keys")


class Agent(Base, TimestampMixin):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)

    stt_provider: Mapped[str] = mapped_column(String(64), default="deepgram", nullable=False)
    tts_provider: Mapped[str] = mapped_column(String(64), default="elevenlabs", nullable=False)
    telephony_provider: Mapped[str] = mapped_column(String(64), default="twilio", nullable=False)
    llm_model: Mapped[str] = mapped_column(String(128), default="gpt-4o-mini", nullable=False)

    voice_id: Mapped[str | None] = mapped_column(String(128))
    language: Mapped[str] = mapped_column(String(16), default="en", nullable=False)
    greeting: Mapped[str | None] = mapped_column(Text)
    settings: Mapped[dict | None] = mapped_column(JSON)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="agents")
    calls: Mapped[list["Call"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )


class Call(Base, TimestampMixin):
    __tablename__ = "calls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    direction: Mapped[CallDirection] = mapped_column(Enum(CallDirection), nullable=False)
    status: Mapped[CallStatus] = mapped_column(
        Enum(CallStatus), default=CallStatus.initiated, nullable=False
    )

    external_call_id: Mapped[str | None] = mapped_column(String(128), index=True)
    from_number: Mapped[str | None] = mapped_column(String(64))
    to_number: Mapped[str | None] = mapped_column(String(64))

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[float | None] = mapped_column(Float)

    cost_usd: Mapped[float | None] = mapped_column(Float)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)

    agent: Mapped[Agent] = relationship(back_populates="calls")
    transcripts: Mapped[list["Transcript"]] = relationship(
        back_populates="call", cascade="all, delete-orphan"
    )
    usage: Mapped[list["UsageLog"]] = relationship(
        back_populates="call", cascade="all, delete-orphan"
    )


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    call_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[TranscriptRole] = mapped_column(Enum(TranscriptRole), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    is_final: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    timestamp_ms: Mapped[int | None] = mapped_column(Integer)

    call: Mapped[Call] = relationship(back_populates="transcripts")


class UsageLog(Base, TimestampMixin):
    __tablename__ = "usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    call_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[ProviderKind] = mapped_column(Enum(ProviderKind), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    units: Mapped[float] = mapped_column(Float, nullable=False)  # seconds, characters, tokens
    unit_type: Mapped[str] = mapped_column(String(32), nullable=False)
    cost_usd: Mapped[float | None] = mapped_column(Float)

    call: Mapped[Call] = relationship(back_populates="usage")


class PhoneNumber(Base, TimestampMixin):
    __tablename__ = "phone_numbers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), index=True
    )
    number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(64), default="twilio", nullable=False)
    extra: Mapped[dict | None] = mapped_column(JSON)
