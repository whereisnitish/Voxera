from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.encryption import get_encryptor
from app.db.models import ApiKey, User
from app.db.session import get_session
from app.schemas.api_key import ApiKeyCreate, ApiKeyRead, ApiKeyUpdate

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("", response_model=ApiKeyRead, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ApiKey:
    encryptor = get_encryptor()
    key = ApiKey(
        user_id=user.id,
        kind=payload.kind,
        provider=payload.provider,
        label=payload.label,
        encrypted_key=encryptor.encrypt(payload.api_key),
        extra=payload.extra,
    )
    session.add(key)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"API key for provider '{payload.provider}' already exists for this user",
        ) from exc
    await session.refresh(key)
    return key


@router.get("", response_model=list[ApiKeyRead])
async def list_api_keys(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ApiKey]:
    result = await session.scalars(select(ApiKey).where(ApiKey.user_id == user.id))
    return list(result.all())


@router.patch("/{key_id}", response_model=ApiKeyRead)
async def update_api_key(
    key_id: UUID,
    payload: ApiKeyUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ApiKey:
    key = await session.get(ApiKey, key_id)
    if not key or key.user_id != user.id:
        raise HTTPException(status_code=404, detail="API key not found")

    if payload.api_key is not None:
        key.encrypted_key = get_encryptor().encrypt(payload.api_key)
    if payload.label is not None:
        key.label = payload.label
    if payload.extra is not None:
        key.extra = payload.extra

    await session.commit()
    await session.refresh(key)
    return key


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    key = await session.get(ApiKey, key_id)
    if not key or key.user_id != user.id:
        raise HTTPException(status_code=404, detail="API key not found")
    await session.delete(key)
    await session.commit()
