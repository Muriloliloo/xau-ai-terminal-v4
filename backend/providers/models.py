"""Canonical normalized contracts shared by every market-data provider."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

import pandas as pd


class FreshnessType(StrEnum):
    REALTIME = "realtime"
    DELAYED = "delayed"
    END_OF_DAY = "end_of_day"
    HISTORICAL = "historical"
    MANUAL = "manual"
    DEMO = "demo"
    UNAVAILABLE = "unavailable"


class ProviderState(StrEnum):
    READY = "ready"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


@dataclass(frozen=True)
class DataFreshness:
    freshness_type: FreshnessType
    market_timestamp: datetime | None
    retrieved_at: datetime
    delay_minutes: int | None


@dataclass(frozen=True)
class ProviderMetadata:
    provider: str
    source: str
    symbol: str
    retrieved_at: datetime
    market_timestamp: datetime | None
    delay_minutes: int | None
    freshness_type: FreshnessType
    is_demo: bool
    is_manual: bool
    is_partial: bool
    warnings: tuple[str, ...] = ()
    missing_fields: tuple[str, ...] = ()
    status: ProviderState = ProviderState.READY
    fallback_used: bool = False
    api_key_configured: bool = False
    last_success: datetime | None = None
    last_error: str | None = None
    known_limit: str | None = None
    cache_ttl_seconds: int | None = None
    capabilities: tuple[str, ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class NormalizedSpot:
    symbol: str
    price: float
    currency: str
    unit: str | None
    metadata: ProviderMetadata


@dataclass(frozen=True)
class NormalizedHistoricalPrice:
    date: str
    close: float


@dataclass(frozen=True)
class NormalizedOptionContract:
    symbol: str | None
    expiration: str | None
    strike: float
    option_type: str
    bid: float | None
    ask: float | None
    last: float | None
    volume: float
    open_interest: float
    previous_open_interest: float | None
    implied_volatility: float | None
    previous_iv: float | None
    delta: float | None
    gamma: float | None
    theta: float | None
    vega: float | None
    underlying_price: float | None
    timestamp: datetime | None
    source: str | None
    aggressor: float | None
    days_to_expiry: float | None = None


@dataclass(frozen=True)
class NormalizedOptionChain:
    contracts: tuple[NormalizedOptionContract, ...]
    metadata: ProviderMetadata

    def to_dataframe(self) -> pd.DataFrame:
        records: list[dict[str, Any]] = []
        for contract in self.contracts:
            record: dict[str, Any] = {
                "symbol": contract.symbol,
                "expiry": contract.expiration,
                "strike": contract.strike,
                "type": contract.option_type,
                "bid": contract.bid,
                "ask": contract.ask,
                "last": contract.last,
                "volume": contract.volume,
                "open_interest": contract.open_interest,
                "previous_open_interest": contract.previous_open_interest,
                "iv": contract.implied_volatility,
                "previous_iv": contract.previous_iv,
                "delta": contract.delta,
                "gamma": contract.gamma,
                "theta": contract.theta,
                "vega": contract.vega,
                "underlying_price": contract.underlying_price,
                "timestamp": contract.timestamp,
                "source": contract.source,
                "aggressor": contract.aggressor,
                "days_to_expiry": contract.days_to_expiry,
            }
            records.append(
                {
                    key: value
                    for key, value in record.items()
                    if value is not None
                }
            )
        return pd.DataFrame.from_records(records)


@dataclass(frozen=True)
class NormalizedMarketData:
    metadata: ProviderMetadata
    spot: NormalizedSpot | None = None
    option_chain: NormalizedOptionChain | None = None
    historical_prices: tuple[NormalizedHistoricalPrice, ...] = ()


@dataclass(frozen=True)
class ProviderHealth:
    provider: str
    available: bool
    status: ProviderState
    message: str
    checked_at: datetime


@dataclass(frozen=True)
class ImportIssue:
    row: int
    field: str
    message: str


@dataclass(frozen=True)
class ImportReport:
    filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    can_import: bool
    issues: tuple[ImportIssue, ...] = ()
    warnings: tuple[str, ...] = ()
    missing_fields: tuple[str, ...] = ()
    preview: tuple[dict[str, Any], ...] = ()


@dataclass(frozen=True)
class ManualImportResult:
    report: ImportReport
    chain: NormalizedOptionChain | None = field(default=None, repr=False)
