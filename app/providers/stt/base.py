from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class TranscriptEvent:
    text: str
    is_final: bool
    confidence: float | None = None
    timestamp_ms: int | None = None


class STTProvider(ABC):
    """Streaming speech-to-text provider."""

    name: str = "base"

    def __init__(self, api_key: str, *, language: str = "en", sample_rate: int = 8000) -> None:
        self.api_key = api_key
        self.language = language
        self.sample_rate = sample_rate

    @abstractmethod
    async def stream(
        self, audio_chunks: AsyncIterator[bytes]
    ) -> AsyncIterator[TranscriptEvent]:
        """Consume PCM/μ-law audio chunks and yield transcript events."""
        raise NotImplementedError
        yield  # pragma: no cover - typing aid

    async def close(self) -> None:
        """Release any underlying resources. Default no-op."""
