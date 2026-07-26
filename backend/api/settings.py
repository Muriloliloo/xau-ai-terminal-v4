"""Read-only runtime settings route."""

from fastapi import APIRouter

from backend.config import SAMPLE_CSV_PATH
from backend.constants import PROJECT_NAME, VERSION
from backend.schemas.settings import SettingsResponse
from backend.services.scheduler_service import scheduler_status

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
def settings() -> SettingsResponse:
    scheduler = scheduler_status()
    return SettingsResponse(
        name=PROJECT_NAME,
        version=VERSION,
        sample_csv_available=SAMPLE_CSV_PATH.exists(),
        history_mode="read-only",
        scheduler_enabled=bool(scheduler["enabled"]),
        realtime_data_enabled=False,
    )
