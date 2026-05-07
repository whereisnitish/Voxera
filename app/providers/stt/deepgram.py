from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveOptions,
    LiveTranscriptionEvents,
)

from app.providers.stt.base import STTProvider, TranscriptEvent

logger = logging.getLogger(__name__)


class DeepgramSTT(STTProvider):
    """Deepgram live streaming STT."""

    name = "deepgram"

    def __init__(
        self,
        api_key: str,
        *,
        language: str = "en",
        sample_rate: int = 8000,
        encoding: str = "mulaw",
        model: str = "nova-2-phonecall",
    ) -> None:
        super().__init__(api_key, language=language, sample_rate=sample_rate)
        self.encoding = encoding
        self.model = model
        self._client = DeepgramClient(api_key, DeepgramClientOptions(options={"keepalive": "true"}))

    async def stream(
        self, audio_chunks: AsyncIterator[bytes]
    ) -> AsyncIterator[TranscriptEvent]:
        connection = self._client.listen.asyncwebsocket.v("1")
        queue: asyncio.Queue[TranscriptEvent | None] = asyncio.Queue()

        async def on_transcript(_self, result, **_kwargs):  # type: ignore[no-untyped-def]
            try:
                alt = result.channel.alternatives[0]
                text = alt.transcript or ""
                if not text.strip():
                    return
                await queue.put(
                    TranscriptEvent(
                        text=text,
                        is_final=bool(result.is_final),
                        confidence=getattr(alt, "confidence", None),
                    )
                )
            except Exception:  # noqa: BLE001
                logger.exception("Deepgram transcript handler error")

        async def on_close(_self, *_args, **_kwargs):  # type: ignore[no-untyped-def]
            await queue.put(None)

        connection.on(LiveTranscriptionEvents.Transcript, on_transcript)
        connection.on(LiveTranscriptionEvents.Close, on_close)

        options = LiveOptions(
            model=self.model,
            language=self.language,
            encoding=self.encoding,
            sample_rate=self.sample_rate,
            channels=1,
            interim_results=True,
            smart_format=True,
            punctuate=True,
            endpointing=300,
        )

        await connection.start(options)

        async def pump_audio() -> None:
            try:
                async for chunk in audio_chunks:
                    if chunk:
                        await connection.send(chunk)
            finally:
                await connection.finish()

        pump_task = asyncio.create_task(pump_audio())

        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield event
        finally:
            pump_task.cancel()
            try:
                await pump_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
