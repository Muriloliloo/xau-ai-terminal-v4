"""FastAPI application entrypoint."""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import (
    analysis,
    gex,
    health,
    history,
    open_interest,
    settings,
    snapshots,
    volatility,
)
from backend.constants import PROJECT_NAME, VERSION
from backend.database.connection import initialize_database


def _cors_origins() -> list[str]:
    configured = os.getenv("XAU_CORS_ORIGINS")

    if configured:
        return [
            origin.strip()
            for origin in configured.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://xau-ai-terminal-v4.vercel.app",
    ]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(snapshots.router, prefix="/api")
app.include_router(open_interest.router, prefix="/api")
app.include_router(gex.router, prefix="/api")
app.include_router(volatility.router, prefix="/api")