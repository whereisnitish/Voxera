from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from openai import AsyncOpenAI


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class AgentEngine:
    """LLM-backed conversation engine for a single call.

    Holds the running message history and yields streamed assistant tokens.
    """

    api_key: str
    system_prompt: str
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    history: list[ChatMessage] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.history or self.history[0].role != "system":
            self.history.insert(0, ChatMessage(role="system", content=self.system_prompt))
        self._client = AsyncOpenAI(api_key=self.api_key)

    async def respond(self, user_text: str) -> AsyncIterator[str]:
        """Append a user turn and stream the assistant reply token-by-token."""
        self.history.append(ChatMessage(role="user", content=user_text))

        stream = await self._client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            stream=True,
            messages=[{"role": m.role, "content": m.content} for m in self.history],
        )

        accumulated: list[str] = []
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content or ""
            if delta:
                accumulated.append(delta)
                yield delta

        self.history.append(ChatMessage(role="assistant", content="".join(accumulated)))
