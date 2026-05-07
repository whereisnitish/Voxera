from __future__ import annotations

from twilio.rest import Client
from twilio.twiml.voice_response import Connect, VoiceResponse

from app.providers.telephony.base import OutboundCallResult, TelephonyProvider


class TwilioTelephony(TelephonyProvider):
    name = "twilio"

    def __init__(
        self,
        api_key: str,  # Twilio auth token
        *,
        account_sid: str | None = None,
        **extra,
    ) -> None:
        if not account_sid:
            raise ValueError("Twilio requires account_sid in api_key extra")
        super().__init__(api_key, account_sid=account_sid, **extra)
        self._client = Client(account_sid, api_key)

    def build_stream_response(self, websocket_url: str, *, greeting: str | None = None) -> str:
        response = VoiceResponse()
        if greeting:
            response.say(greeting)
        connect = Connect()
        connect.stream(url=websocket_url)
        response.append(connect)
        return str(response)

    async def place_outbound_call(
        self, *, to: str, from_: str, websocket_url: str
    ) -> OutboundCallResult:
        twiml = VoiceResponse()
        connect = Connect()
        connect.stream(url=websocket_url)
        twiml.append(connect)

        call = self._client.calls.create(to=to, from_=from_, twiml=str(twiml))
        return OutboundCallResult(external_call_id=call.sid, status=call.status)
