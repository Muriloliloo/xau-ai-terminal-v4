"""System health route."""

from fastapi import APIRouter

from backend.constants import PROJECT_NAME, VERSION
from backend.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", name=PROJECT_NAME, version=VERSION)
