import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import agents, api_keys, auth, calls, stream, telephony
from app.core.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Voxera — production-grade Voice AI platform",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_prefix = "/api"
    app.include_router(auth.router, prefix=api_prefix)
    app.include_router(api_keys.router, prefix=api_prefix)
    app.include_router(agents.router, prefix=api_prefix)
    app.include_router(calls.router, prefix=api_prefix)
    app.include_router(telephony.router, prefix=api_prefix)
    app.include_router(stream.router, prefix=api_prefix)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
