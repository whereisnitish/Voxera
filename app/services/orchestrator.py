"""Voice orchestrator: bridges a Twilio Media Stream WS to STT → LLM → TTS.

Twilio Media Streams protocol (summary):
- inbound JSON frames: {"event": "start"|"media"|"stop", "media": {"payload": "<b64 mulaw>"}, "streamSid": "..."}
- outbound media: {"event": "media", "streamSid": "...", "media": {"payload": "<b64 mulaw>"}}
- audio is μ-law 8kHz mono, 20ms frames.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass

from fastapi import WebSocket

from app.providers.stt.base import STTProvider, TranscriptEvent
from app.providers.tts.base import TTSProvider
from app.services.agent_engine import AgentEngine

logger = logging.getLogger(__name__)


SENTENCE_END = re.compile(r"([.!?]+|[\n]+)")


@dataclass
class CallSession:
    call_id: str
    agent_engine: AgentEngine
    stt: STTProvider
    tts: TTSProvider
    on_user_transcript: callable | None = None  # async (text, is_final)
    on_agent_transcript: callable | None = None  # async (text)


class VoiceOrchestrator:
    """Owns the per-call streaming pipeline."""

    def __init__(self, websocket: WebSocket, session: CallSession) -> None:
        self.ws = websocket
        self.session = session
        self.stream_sid: str | None = None
        self._inbound_audio: asyncio.Queue[bytes] = asyncio.Queue(maxsize=1024)
        self._stop = asyncio.Event()
        self._speaking_task: asyncio.Task | None = None

    async def run(self) -> None:
        await self.ws.accept()
        try:
            await asyncio.gather(
                self._consume_websocket(),
                self._consume_transcripts(),
            )
        except Exception:
            logger.exception("Orchestrator crashed")
        finally:
            self._stop.set()
            await self.session.stt.close()
            await self.session.tts.close()

    # ------------------------------------------------------------------ #
    # WebSocket ingest
    # ------------------------------------------------------------------ #
    async def _consume_websocket(self) -> None:
        try:
            while not self._stop.is_set():
                msg = await self.ws.receive_text()
                data = json.loads(msg)
                event = data.get("event")

                if event == "start":
                    self.stream_sid = data["start"]["streamSid"]
                    logger.info("Stream started: %s", self.stream_sid)
                    if greeting := getattr(self.session, "greeting", None):
                        asyncio.create_task(self._speak(greeting))
                elif event == "media":
                    payload = data["media"]["payload"]
                    chunk = base64.b64decode(payload)
                    try:
                        self._inbound_audio.put_nowait(chunk)
                    except asyncio.QueueFull:
                        logger.warning("Inbound audio queue full — dropping")
                elif event == "stop":
                    logger.info("Stream stopped: %s", self.stream_sid)
                    break
        except Exception:
            logger.exception("WebSocket read error")
        finally:
            self._stop.set()
            await self._inbound_audio.put(b"")  # unblock STT iterator

    async def _audio_iterator(self) -> AsyncIterator[bytes]:
        while not self._stop.is_set():
            chunk = await self._inbound_audio.get()
            if not chunk and self._stop.is_set():
                return
            if chunk:
                yield chunk

    # ------------------------------------------------------------------ #
    # STT → LLM → TTS loop
    # ------------------------------------------------------------------ #
    async def _consume_transcripts(self) -> None:
        async for event in self.session.stt.stream(self._audio_iterator()):
            await self._handle_transcript(event)

    async def _handle_transcript(self, event: TranscriptEvent) -> None:
        if self.session.on_user_transcript:
            await self.session.on_user_transcript(event.text, event.is_final)

        if not event.is_final or not event.text.strip():
            return

        # Barge-in: cancel any current TTS playback
        if self._speaking_task and not self._speaking_task.done():
            self._speaking_task.cancel()

        self._speaking_task = asyncio.create_task(self._respond_and_speak(event.text))

    async def _respond_and_speak(self, user_text: str) -> None:
        """Stream LLM tokens, flushing complete sentences to TTS as they form."""
        buffer = ""
        full_response = ""
        try:
            async for token in self.session.agent_engine.respond(user_text):
                buffer += token
                full_response += token
                # Flush at sentence boundaries for low-latency TTS
                while True:
                    match = SENTENCE_END.search(buffer)
                    if not match:
                        break
                    sentence = buffer[: match.end()].strip()
                    buffer = buffer[match.end():]
                    if sentence:
                        await self._speak(sentence)

            tail = buffer.strip()
            if tail:
                await self._speak(tail)

            if self.session.on_agent_transcript and full_response.strip():
                await self.session.on_agent_transcript(full_response.strip())
        except asyncio.CancelledError:
            logger.info("Speech cancelled (barge-in)")
            raise

    async def _speak(self, text: str) -> None:
        if not self.stream_sid:
            return
        async for chunk in self.session.tts.synthesize(text):
            if self._stop.is_set():
                return
            payload = base64.b64encode(chunk).decode("ascii")
            await self.ws.send_text(
                json.dumps(
                    {
                        "event": "media",
                        "streamSid": self.stream_sid,
                        "media": {"payload": payload},
                    }
                )
            )
