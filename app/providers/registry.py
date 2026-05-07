"""Central registry mapping provider names → concrete classes.

Adding a new provider is a one-line change here. The orchestrator never imports
a concrete provider directly — it asks the registry.
"""
from __future__ import annotations

from app.providers.stt.base import STTProvider
from app.providers.stt.deepgram import DeepgramSTT
from app.providers.telephony.base import TelephonyProvider
from app.providers.telephony.twilio import TwilioTelephony
from app.providers.tts.base import TTSProvider
from app.providers.tts.elevenlabs import ElevenLabsTTS

STT_REGISTRY: dict[str, type[STTProvider]] = {
    "deepgram": DeepgramSTT,
}

TTS_REGISTRY: dict[str, type[TTSProvider]] = {
    "elevenlabs": ElevenLabsTTS,
}

TELEPHONY_REGISTRY: dict[str, type[TelephonyProvider]] = {
    "twilio": TwilioTelephony,
}


def build_stt(name: str, api_key: str, **kwargs) -> STTProvider:
    cls = STT_REGISTRY.get(name)
    if not cls:
        raise ValueError(f"Unknown STT provider: {name}")
    return cls(api_key, **kwargs)


def build_tts(name: str, api_key: str, **kwargs) -> TTSProvider:
    cls = TTS_REGISTRY.get(name)
    if not cls:
        raise ValueError(f"Unknown TTS provider: {name}")
    return cls(api_key, **kwargs)


def build_telephony(name: str, api_key: str, **kwargs) -> TelephonyProvider:
    cls = TELEPHONY_REGISTRY.get(name)
    if not cls:
        raise ValueError(f"Unknown telephony provider: {name}")
    return cls(api_key, **kwargs)
