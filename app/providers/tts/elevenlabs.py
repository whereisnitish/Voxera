from __future__ import annotations

from collections.abc import AsyncIterator

import httpx

from app.providers.tts.base import TTSProvider


class ElevenLabsTTS(TTSProvider):
    """ElevenLabs streaming TTS.

    Uses the streaming endpoint with μ-law 8kHz output for direct Twilio playback.
    """

    name = "elevenlabs"
    BASE_URL = "https://api.elevenlabs.io/v1"
    DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"

    def __init__(
        self,
        api_key: str,
        *,
        voice_id: str | None = None,
        model_id: str = "eleven_turbo_v2_5",
        output_format: str = "ulaw_8000",
        sample_rate: int = 8000,
    ) -> None:
        super().__init__(
            api_key,
            voice_id=voice_id or self.DEFAULT_VOICE,
            sample_rate=sample_rate,
            output_format=output_format,
        )
        self.model_id = model_id

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}/stream"
        params = {"output_format": self.output_format}
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/*",
        }
        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            async with client.stream(
                "POST", url, params=params, headers=headers, json=payload
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes(chunk_size=1024):
                    if chunk:
                        yield chunk
