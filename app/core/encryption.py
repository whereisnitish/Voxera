from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class Encryptor:
    """Symmetric encryption for sensitive values (API keys, secrets).

    Uses Fernet (AES-128-CBC + HMAC). Keys are urlsafe-base64 32-byte values.
    """

    def __init__(self, key: str | None = None) -> None:
        key = key or settings.encryption_key
        if not key:
            raise RuntimeError(
                "ENCRYPTION_KEY is not configured. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        self._fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt(self, token: str) -> str:
        try:
            return self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("Failed to decrypt value — wrong key or corrupted data") from exc


_encryptor: Encryptor | None = None


def get_encryptor() -> Encryptor:
    global _encryptor
    if _encryptor is None:
        _encryptor = Encryptor()
    return _encryptor
