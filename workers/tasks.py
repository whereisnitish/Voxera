"""Background tasks: post-call processing, cost rollups, transcript exports."""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select

from app.db.models import Call, ProviderKind, UsageLog
from app.db.session import AsyncSessionLocal
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Rough $/sec rates — replace with live pricing config per provider.
PRICING = {
    "deepgram": 0.0043 / 60,   # $0.0043/min
    "elevenlabs": 0.0001,      # $/character (tts pricing differs — placeholder)
    "twilio": 0.013 / 60,      # $0.013/min inbound
}


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="voxera.finalize_call")
def finalize_call(call_id: str) -> None:
    """Compute final duration, cost, and aggregate usage logs after a call ends."""
    _run(_finalize_call(UUID(call_id)))


async def _finalize_call(call_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        call = await session.get(Call, call_id)
        if not call or not call.duration_seconds:
            return

        rows = await session.scalars(select(UsageLog).where(UsageLog.call_id == call_id))
        usage = list(rows.all())

        total = 0.0
        for log in usage:
            if log.cost_usd is not None:
                total += log.cost_usd
                continue
            rate = PRICING.get(log.provider, 0.0)
            log.cost_usd = log.units * rate
            total += log.cost_usd

        # Telephony minutes if not already logged
        if not any(u.kind == ProviderKind.telephony for u in usage):
            tel_cost = call.duration_seconds * PRICING.get("twilio", 0.0)
            session.add(
                UsageLog(
                    call_id=call.id,
                    kind=ProviderKind.telephony,
                    provider="twilio",
                    units=call.duration_seconds,
                    unit_type="seconds",
                    cost_usd=tel_cost,
                )
            )
            total += tel_cost

        call.cost_usd = total
        await session.commit()
        logger.info("Finalized call %s — duration %.1fs, cost $%.4f",
                    call_id, call.duration_seconds, total)
