"""Internal API contracts for normalized market data."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

FreshnessType = Literal[
    "realtime",
    "delayed",
    "end_of_day",
    "historical",
    "manual",
    "demo",
    "unavailable",
]
ProviderState = Literal["ready", "unavailable", "error"]


class DataMetadataResponse(BaseModel):
    provider: str
    source: str
    symbol: str
    retrieved_at: datetime
    market_timestamp: datetime | None = None
    delay_minutes: int | None = Field(default=None, ge=0)
    freshness_type: FreshnessType
    is_demo: bool
    is_manual: bool = False
    is_partial: bool
    warnings: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    status: ProviderState
    fallback_used: bool = False


class ProviderStatusResponse(DataMetadataResponse):
    api_key_configured: bool = False
    last_success: datetime | None = None
    last_error: str | None = None
    known_limit: str | None = None
    cache_ttl_seconds: int | None = None
    capabilities: list[str] = Field(default_factory=list)


class ProvidersResponse(BaseModel):
    selected_provider: str
    fallback_enabled: bool
    providers: list[ProviderStatusResponse]


class SpotResponse(BaseModel):
    price: float = Field(gt=0)
    currency: str
    unit: str | None = None


class MarketSpotResponse(BaseModel):
    data: SpotResponse | None
    metadata: DataMetadataResponse


class HistoricalPriceResponse(BaseModel):
    date: str
    close: float = Field(gt=0)


class MarketHistoryResponse(BaseModel):
    data: list[HistoricalPriceResponse]
    metadata: DataMetadataResponse


class OptionContractResponse(BaseModel):
    symbol: str | None = None
    expiration: str | None = None
    strike: float = Field(gt=0)
    option_type: Literal["CALL", "PUT"]
    bid: float | None = Field(default=None, ge=0)
    ask: float | None = Field(default=None, ge=0)
    last: float | None = Field(default=None, ge=0)
    volume: float = Field(ge=0)
    open_interest: float = Field(ge=0)
    previous_open_interest: float | None = Field(default=None, ge=0)
    implied_volatility: float | None = Field(default=None, gt=0)
    previous_iv: float | None = Field(default=None, gt=0)
    delta: float | None = Field(default=None, ge=-1, le=1)
    gamma: float | None = Field(default=None, ge=0)
    theta: float | None = None
    vega: float | None = Field(default=None, ge=0)
    underlying_price: float | None = Field(default=None, gt=0)
    timestamp: datetime | None = None
    source: str | None = None
    aggressor: float | None = None
    days_to_expiry: float | None = Field(default=None, gt=0)


class MarketOptionsResponse(BaseModel):
    data: list[OptionContractResponse]
    metadata: DataMetadataResponse


class ImportIssueResponse(BaseModel):
    row: int = Field(ge=0)
    field: str
    message: str


class ImportReportResponse(BaseModel):
    filename: str
    total_rows: int = Field(ge=0)
    valid_rows: int = Field(ge=0)
    invalid_rows: int = Field(ge=0)
    can_import: bool
    issues: list[ImportIssueResponse]
    warnings: list[str]
    missing_fields: list[str]
    preview: list[dict[str, Any]]


class ManualImportResponse(BaseModel):
    imported: bool
    report: ImportReportResponse
    metadata: DataMetadataResponse | None = None
    analysis: Any | None = None
