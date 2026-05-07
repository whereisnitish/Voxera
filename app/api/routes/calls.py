from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.encryption import get_encryptor
from app.db.models import Agent, ApiKey, Call, CallDirection, ProviderKind, Transcript, User
from app.db.session import get_session
from app.providers.registry import build_telephony
from app.schemas.call import CallRead, OutboundCallCreate, TranscriptRead

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("", response_model=list[CallRead])
async def list_calls(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    limit: int = 50,
) -> list[Call]:
    result = await session.scalars(
        select(Call)
        .where(Call.user_id == user.id)
        .order_by(Call.created_at.desc())
        .limit(limit)
    )
    return list(result.all())


@router.get("/{call_id}", response_model=CallRead)
async def get_call(
    call_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Call:
    call = await session.get(Call, call_id)
    if not call or call.user_id != user.id:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/{call_id}/transcripts", response_model=list[TranscriptRead])
async def get_call_transcripts(
    call_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Transcript]:
    call = await session.get(Call, call_id)
    if not call or call.user_id != user.id:
        raise HTTPException(status_code=404, detail="Call not found")

    result = await session.scalars(
        select(Transcript)
        .where(Transcript.call_id == call_id)
        .order_by(Transcript.sequence.asc())
    )
    return list(result.all())


@router.post("/outbound", response_model=CallRead, status_code=status.HTTP_201_CREATED)
async def place_outbound_call(
    payload: OutboundCallCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Call:
    from app.core.config import settings

    agent = await session.get(Agent, payload.agent_id)
    if not agent or agent.user_id != user.id:
        raise HTTPException(status_code=404, detail="Agent not found")

    telephony_key = await session.scalar(
        select(ApiKey).where(
            ApiKey.user_id == user.id,
            ApiKey.kind == ProviderKind.telephony,
            ApiKey.provider == agent.telephony_provider,
        )
    )
    if not telephony_key:
        raise HTTPException(
            status_code=400,
            detail=f"No {agent.telephony_provider} telephony key configured",
        )

    encryptor = get_encryptor()
    extra = telephony_key.extra or {}
    telephony = build_telephony(
        agent.telephony_provider,
        encryptor.decrypt(telephony_key.encrypted_key),
        account_sid=extra.get("account_sid"),
    )

    call = Call(
        user_id=user.id,
        agent_id=agent.id,
        direction=CallDirection.outbound,
        from_number=payload.from_,
        to_number=payload.to,
    )
    session.add(call)
    await session.commit()
    await session.refresh(call)

    ws_url = (
        settings.public_base_url.replace("http://", "ws://").replace("https://", "wss://")
        + f"/api/stream/{call.id}"
    )
    result = await telephony.place_outbound_call(
        to=payload.to, from_=payload.from_, websocket_url=ws_url
    )
    call.external_call_id = result.external_call_id
    await session.commit()
    await session.refresh(call)
    return call
