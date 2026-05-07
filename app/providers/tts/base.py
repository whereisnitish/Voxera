from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class TTSProvider(ABC):
    """Streaming text-to-speech provider."""

    name: str = "base"

    def __init__(
        self,
        api_key: str,
        *,
        voice_id: str | None = None,
        sample_rate: int = 8000,
        output_format: str = "mulaw_8000",
    ) -> None:
        self.api_key = api_key
        self.voice_id = voice_id
        self.sample_rate = sample_rate
        self.output_format = output_format

    @abstractmethod
    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Convert text to an async stream of audio chunks (μ-law @ 8kHz by default)."""
        raise NotImplementedError
        yield b""  # pragma: no cover - typing aid

    async def close(self) -> None:
        """Release any underlying resources. Default no-op."""
