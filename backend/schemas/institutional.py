"""Contracts for the active institutional data source."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.schemas.cme_bulletin import (
    CmeBulletinImport,
    CmeOpenInterestAnalysis,
    CmeSpotAlignment,
)

InstitutionalDataMode = Literal[
    "auto",
    "real_eod",
    "manual",
    "csv",
    "demo",
    "unavailable",
]


class InstitutionalDataState(BaseModel):
    provider: str | None = None
    source: str | None = None
    source_type: str | None = None
    freshness_type: str = "unavailable"
    market_date: date | None = None
    imported_at: datetime | None = None
    spot_provider: str | None = None
    spot_timestamp: datetime | None = None
    spot_price: float | None = None
    cme_import_id: int | None = None
    data_mode: InstitutionalDataMode
    fallback_active: bool = False
    is_demo: bool = False
    is_manual: bool = False
    is_partial: bool = True
    eligibility: str | None = None
    available_metrics: list[str] = Field(default_factory=list)
    unavailable_metrics: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    contract_count: int = 0
    calls: int = 0
    puts: int = 0
    open_interest_total: float | None = None
    volume_total: float | None = None
    spot_alignment: CmeSpotAlignment | None = None


class InstitutionalLatestResponse(BaseModel):
    state: InstitutionalDataState
    available: bool
    latest: CmeBulletinImport | None = None
    open_interest: CmeOpenInterestAnalysis | None = None


class InstitutionalModeRequest(BaseModel):
    mode: InstitutionalDataMode


class InstitutionalModeResponse(BaseModel):
    updated: bool = True
    state: InstitutionalDataState
