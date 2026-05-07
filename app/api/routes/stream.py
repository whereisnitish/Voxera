"""WebSocket endpoint that bridges Twilio Media Streams to the orchestrator."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.encryption import get_encryptor
from app.db.models import (
    Agent,
    ApiKey,
    Call,
    CallStatus,
    ProviderKind,
    Transcript,
    TranscriptRole,
)
from app.db.session import AsyncSessionLocal, get_session
from app.providers.registry import build_stt, build_tts
from app.services.agent_engine import AgentEngine
from app.services.orchestrator import CallSession, VoiceOrchestrator

router = APIRouter(prefix="/stream", tags=["stream"])


async def _load_user_key(
    session: AsyncSession, user_id: UUID, kind: ProviderKind, provider: str
) -> tuple[str, dict | None] | None:
    row = await session.scalar(
        select(ApiKey).where(
            ApiKey.user_id == user_id,
            ApiKey.kind == kind,
            ApiKey.provider == provider,
        )
    )
    if not row:
        return None
    return get_encryptor().decrypt(row.encrypted_key), row.extra


@router.websocket("/{call_id}")
async def stream_call(
    websocket: WebSocket,
    call_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    call = await session.get(Call, call_id)
    if not call:
        await websocket.close(code=4404)
        return

    agent = await session.get(Agent, call.agent_id)
    if not agent:
        await websocket.close(code=4404)
        return

    stt_creds = await _load_user_key(session, call.user_id, ProviderKind.stt, agent.stt_provider)
    tts_creds = await _load_user_key(session, call.user_id, ProviderKind.tts, agent.tts_provider)

    if not stt_creds or not tts_creds:
        await websocket.close(code=4400)
        return

    llm_creds = await _load_user_key(session, call.user_id, ProviderKind.llm, "openai")
    llm_api_key = llm_creds[0] if llm_creds else settings.openai_api_key
    if not llm_api_key:
        await websocket.close(code=4400)
        return

    stt = build_stt(agent.stt_provider, stt_creds[0], language=agent.language)
    tts = build_tts(agent.tts_provider, tts_creds[0], voice_id=agent.voice_id)
    engine = AgentEngine(
        api_key=llm_api_key, system_prompt=agent.system_prompt, model=agent.llm_model
    )

    # Mark call active
    call.status = CallStatus.in_progress
    if not call.started_at:
        call.started_at = datetime.now(timezone.utc)
    await session.commit()

    transcript_seq = {"n": 0}

    async def persist_transcript(role: TranscriptRole, text: str, *, is_final: bool = True) -> None:
        async with AsyncSessionLocal() as s:
            transcript_seq["n"] += 1
            s.add(
                Transcript(
                    call_id=call.id,
                    role=role,
                    text=text,
                    sequence=transcript_seq["n"],
                    is_final=is_final,
                )
            )
            await s.commit()

    async def on_user(text: str, is_final: bool) -> None:
        if is_final and text.strip():
            await persist_transcript(TranscriptRole.user, text, is_final=True)

    async def on_agent(text: str) -> None:
        await persist_transcript(TranscriptRole.agent, text, is_final=True)

    call_session = CallSession(
        call_id=str(call.id),
        agent_engine=engine,
        stt=stt,
        tts=tts,
        on_user_transcript=on_user,
        on_agent_transcript=on_agent,
    )
    # Stash greeting on session so orchestrator can play it on stream start
    setattr(call_session, "greeting", agent.greeting)

    orchestrator = VoiceOrchestrator(websocket, call_session)
    try:
        await orchestrator.run()
    except WebSocketDisconnect:
        pass
    finally:
        async with AsyncSessionLocal() as s:
            stored = await s.get(Call, call.id)
            if stored:
                stored.status = CallStatus.completed
                stored.ended_at = datetime.now(timezone.utc)
                if stored.started_at:
                    stored.duration_seconds = (
                        stored.ended_at - stored.started_at
                    ).total_seconds()
                await s.commit()
