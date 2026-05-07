from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OutboundCallResult:
    external_call_id: str
    status: str


class TelephonyProvider(ABC):
    """Telephony provider — places/receives calls and exposes a streaming bridge."""

    name: str = "base"

    def __init__(self, api_key: str, *, account_sid: str | None = None, **extra) -> None:
        self.api_key = api_key
        self.account_sid = account_sid
        self.extra = extra

    @abstractmethod
    def build_stream_response(self, websocket_url: str, *, greeting: str | None = None) -> str:
        """Return the provider-specific markup that connects an inbound call to our WS."""

    @abstractmethod
    async def place_outbound_call(
        self, *, to: str, from_: str, websocket_url: str
    ) -> OutboundCallResult:
        """Place an outbound call that streams to our WebSocket."""
