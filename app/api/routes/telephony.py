"""Telephony provider webhooks (Twilio: /incoming-call).

Twilio hits this endpoint when a call arrives at one of our user's numbers.
We look up which agent owns the destination number, create a Call row, and
return TwiML that opens a Media Stream WebSocket to /api/stream/{call_id}.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.encryption import get_encryptor
from app.db.models import (
    Agent,
    ApiKey,
    Call,
    CallDirection,
    CallStatus,
    PhoneNumber,
    ProviderKind,
)
from app.db.session import get_session
from app.providers.registry import build_telephony

router = APIRouter(prefix="/telephony", tags=["telephony"])


@router.post("/twilio/incoming-call")
async def twilio_incoming_call(
    From: str = Form(...),
    To: str = Form(...),
    CallSid: str = Form(...),
    session: AsyncSession = Depends(get_session),
) -> Response:
    number = await session.scalar(select(PhoneNumber).where(PhoneNumber.number == To))
    if not number or not number.agent_id:
        raise HTTPException(status_code=404, detail="No agent assigned to this number")

    agent = await session.get(Agent, number.agent_id)
    if not agent or not agent.is_active:
        raise HTTPException(status_code=404, detail="Agent inactive")

    telephony_key = await session.scalar(
        select(ApiKey).where(
            ApiKey.user_id == number.user_id,
            ApiKey.kind == ProviderKind.telephony,
            ApiKey.provider == "twilio",
        )
    )
    if not telephony_key:
        raise HTTPException(status_code=400, detail="Twilio key not configured")

    call = Call(
        user_id=number.user_id,
        agent_id=agent.id,
        direction=CallDirection.inbound,
        status=CallStatus.ringing,
        from_number=From,
        to_number=To,
        external_call_id=CallSid,
        started_at=datetime.now(timezone.utc),
    )
    session.add(call)
    await session.commit()
    await session.refresh(call)

    encryptor = get_encryptor()
    extra = telephony_key.extra or {}
    telephony = build_telephony(
        "twilio",
        encryptor.decrypt(telephony_key.encrypted_key),
        account_sid=extra.get("account_sid"),
    )

    ws_url = (
        settings.public_base_url.replace("http://", "ws://").replace("https://", "wss://")
        + f"/api/stream/{call.id}"
    )
    twiml = telephony.build_stream_response(ws_url, greeting=agent.greeting)
    return Response(content=twiml, media_type="application/xml")
