"""Contracts for the manual CME Daily Bulletin import flow."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

CmeValidationStatus = Literal[
    "valid",
    "valid_with_warnings",
    "partial",
    "incompatible",
    "rejected",
]
CmeEligibility = Literal[
    "full_analysis_allowed",
    "partial_analysis_allowed",
    "open_interest_only",
    "blocked",
]
CmeSpotAlignmentStatus = Literal[
    "aligned",
    "acceptable_with_warning",
    "stale",
    "incompatible",
    "unavailable",
]


class CmeBulletinContract(BaseModel):
    symbol: str = "GC"
    exchange: str = "COMEX"
    product_code: str
    product_name: str
    expiration: str | None = None
    contract_month: str
    strike: float = Field(gt=0)
    option_type: Literal["CALL", "PUT"]
    settlement: float | None = Field(default=None, ge=0)
    volume: float | None = Field(default=None, ge=0)
    open_outcry_volume: float | None = Field(default=None, ge=0)
    globex_volume: float | None = Field(default=None, ge=0)
    pnt_volume: float | None = Field(default=None, ge=0)
    open_interest: float | None = Field(default=None, ge=0)
    open_interest_change: float | None = None
    delta: float | None = Field(default=None, ge=-1, le=1)
    implied_volatility: float | None = Field(default=None, gt=0)
    gamma: float | None = Field(default=None, ge=0)
    underlying_price: float | None = Field(default=None, gt=0)
    market_date: date | None = None
    source: str
    source_page: int = Field(ge=1)
    source_line: int = Field(ge=1)
    raw_text: str


class CmeValidationIssue(BaseModel):
    page: int | None = Field(default=None, ge=1)
    line: int | None = Field(default=None, ge=1)
    field: str
    message: str


class CmeValidationReport(BaseModel):
    status: CmeValidationStatus
    pages_total: int = Field(ge=0)
    pages_processed: int = Field(ge=0)
    gold_pages: list[int] = Field(default_factory=list)
    blocks_found: int = Field(ge=0)
    product_codes: list[str] = Field(default_factory=list)
    calls_found: int = Field(ge=0)
    puts_found: int = Field(ge=0)
    expiration_labels: list[str] = Field(default_factory=list)
    expirations_found: list[str] = Field(default_factory=list)
    valid_contracts: int = Field(ge=0)
    partial_contracts: int = Field(ge=0)
    ignored_lines: int = Field(ge=0)
    duplicates: int = Field(ge=0)
    invalid_strikes: int = Field(ge=0)
    invalid_open_interest: int = Field(ge=0)
    invalid_volume: int = Field(ge=0)
    missing_expiration: int = Field(ge=0)
    missing_critical_fields: list[str] = Field(default_factory=list)
    failed_pages: list[int] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    blocking_errors: list[str] = Field(default_factory=list)
    issues: list[CmeValidationIssue] = Field(default_factory=list)


class CmeEligibilityReport(BaseModel):
    status: CmeEligibility
    reason: str
    engines_allowed: list[str] = Field(default_factory=list)
    contracts_with_open_interest: int = Field(ge=0)
    contracts_with_volume: int = Field(ge=0)
    contracts_with_gamma: int = Field(ge=0)
    contracts_with_expiration: int = Field(ge=0)
    has_calls: bool
    has_puts: bool
    has_compatible_spot: bool


class CmeSpotAlignment(BaseModel):
    status: CmeSpotAlignmentStatus
    bulletin_date: date | None = None
    spot_timestamp: datetime | None = None
    date_difference_days: int | None = None
    warning: str | None = None


class CmeBulletinMetadata(BaseModel):
    provider: Literal["cme_bulletin"] = "cme_bulletin"
    source: str = "CME Group Daily Information Bulletin — Section 64"
    freshness_type: Literal["end_of_day"] = "end_of_day"
    is_manual: Literal[True] = True
    is_demo: Literal[False] = False
    is_partial: bool
    bulletin_date: date | None = None
    market_timestamp: datetime | None = None
    retrieved_at: datetime
    delay_minutes: None = None
    warnings: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(
        default_factory=lambda: [
            "options",
            "open_interest",
            "volume",
            "settlement",
            "end_of_day",
            "manual_import",
        ]
    )


class CmeOpenInterestAnalysis(BaseModel):
    call_oi_total: float = Field(ge=0)
    put_oi_total: float = Field(ge=0)
    total_oi: float = Field(ge=0)
    net_oi: float
    largest_call_oi_strike: float | None = None
    largest_put_oi_strike: float | None = None
    largest_concentration_strike: float | None = None
    largest_concentration_pct: float = Field(ge=0)
    oi_concentration_score: float = Field(ge=0)
    top_10_strikes: list[dict[str, float | int]]
    distribution_by_strike: list[dict[str, float | int]]


class CmeBulletinPreview(BaseModel):
    preview_id: str
    expires_at: datetime
    filename: str
    file_hash: str
    duplicate: bool
    duplicate_import_id: int | None = None
    metadata: CmeBulletinMetadata
    report: CmeValidationReport
    eligibility: CmeEligibilityReport
    spot_alignment: CmeSpotAlignment
    sample_contracts: list[CmeBulletinContract]


class CmeBulletinConfirmRequest(BaseModel):
    preview_id: str = Field(min_length=16, max_length=200)
    allow_reprocess: bool = False
    spot_timestamp: datetime | None = None


class CmeBulletinImport(BaseModel):
    id: int = Field(ge=1)
    filename: str
    file_hash: str
    imported_at: datetime
    reprocessed: bool
    reprocessed_from_id: int | None = None
    metadata: CmeBulletinMetadata
    report: CmeValidationReport
    eligibility: CmeEligibilityReport
    spot_alignment: CmeSpotAlignment
    contract_count: int = Field(ge=0)
    contracts: list[CmeBulletinContract]
    open_interest_analysis: CmeOpenInterestAnalysis | None = None
    snapshot_created: Literal[False] = False


class CmeBulletinConfirmResponse(BaseModel):
    imported: Literal[True] = True
    result: CmeBulletinImport


class CmeBulletinLatestResponse(BaseModel):
    available: bool
    result: CmeBulletinImport | None = None


class CmeBulletinStatusResponse(BaseModel):
    provider: Literal["cme_bulletin"] = "cme_bulletin"
    available: bool
    preview_count: int = Field(ge=0)
    preview_ttl_seconds: int = Field(ge=1)
    max_previews: int = Field(ge=1)
    max_file_bytes: int = Field(ge=1)
    max_pages: int = Field(ge=1)
    max_processing_seconds: float = Field(gt=0)
    latest_import_id: int | None = None
    latest_bulletin_date: date | None = None
    freshness_type: Literal["end_of_day"] = "end_of_day"
    is_manual: Literal[True] = True
    legal_notice: str
