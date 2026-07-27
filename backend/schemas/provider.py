"""Schemas for the active institutional provider."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class CurrentProviderResponse(BaseModel):
    provider: str
    origin: str | None = None
    market_date: date | None = None
    last_updated: datetime | None = None
    snapshot_id: int | None = Field(default=None, ge=1)
    snapshot: dict[str, Any] | None = None
    contract_count: int = Field(default=0, ge=0)
    calls: int = Field(default=0, ge=0)
    puts: int = Field(default=0, ge=0)
    open_interest_total: float | None = None
    volume_total: float | None = None
    is_demo: bool = False
    available: bool = False
