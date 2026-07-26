"""Settings endpoint contract."""

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    name: str
    version: str
    sample_csv_available: bool
    history_mode: str
    scheduler_enabled: bool
    realtime_data_enabled: bool
