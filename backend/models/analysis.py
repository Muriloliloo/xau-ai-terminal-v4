"""Models returned by the institutional analysis use case."""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class GammaSummary:
    call_wall: float | None
    put_wall: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    total_gex: float

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "GammaSummary":
        return cls(
            call_wall=values["Call Wall"],
            put_wall=values["Put Wall"],
            gamma_flip=values["Gamma Flip"],
            gamma_magnet=values["Gamma Magnet"],
            total_gex=float(values["GEX Total"]),
        )


@dataclass(frozen=True)
class DealerAnalysis:
    regime: str
    dealer_bias: str
    volatility: str
    confidence: float

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "DealerAnalysis":
        return cls(
            regime=str(values["regime"]),
            dealer_bias=str(values["dealer_bias"]),
            volatility=str(values["volatility"]),
            confidence=float(values["confidence"]),
        )


@dataclass(frozen=True)
class OpenInterestSummary:
    call_oi_total: float
    put_oi_total: float
    total_oi: float
    net_oi: float
    largest_call_oi_strike: float | None
    largest_put_oi_strike: float | None
    new_oi_total: float
    reduced_oi_total: float
    largest_oi_increase_strike: float | None
    largest_oi_decrease_strike: float | None
    max_concentration_pct: float
    largest_concentration_strike: float | None
    oi_concentration_score: float
    top_10_strikes: list[dict[str, float | int]]
    has_previous_open_interest: bool

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "OpenInterestSummary":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class GammaV2Summary:
    call_gex_total: float
    put_gex_total: float
    net_gex_total: float
    gross_gex_total: float
    strongest_positive_gex_strike: float | None
    strongest_negative_gex_strike: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    call_wall: float | None
    put_wall: float | None
    distance_flip_to_call_wall: float | None
    distance_flip_to_put_wall: float | None
    gex_concentration_by_region: dict[str, float]
    regime_strength: str

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "GammaV2Summary":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class GammaExposureSummary:
    call_gex: float
    put_gex: float
    net_gex: float
    total_gex: float
    largest_positive_gex_strike: float | None
    largest_positive_gex: float
    largest_negative_gex_strike: float | None
    largest_negative_gex: float
    dealer_pressure: str
    dealer_pressure_score: float
    gamma_flip: float | None
    gamma_magnet: float | None
    gamma_source: str
    contract_multiplier: int
    spot_adjusted: bool

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "GammaExposureSummary":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class VolatilitySummary:
    weighted_iv: float | None
    call_iv: float | None
    put_iv: float | None
    iv_skew: float | None
    call_skew: float | None
    put_skew: float | None
    skew_classification: str | None
    minimum_iv: float | None
    maximum_iv: float | None
    highest_iv_strike: float | None
    lowest_iv_strike: float | None
    weighted_iv_change: float | None
    largest_iv_increase_strike: float | None
    largest_iv_increase: float | None
    largest_iv_decrease_strike: float | None
    largest_iv_decrease: float | None
    has_iv: bool
    has_previous_iv: bool

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "VolatilitySummary":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class ExpectedMove:
    available: bool
    reason: str
    expected_move_points: float | None
    expected_move_pct: float | None
    upper_level: float | None
    lower_level: float | None
    expiry: str | None

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "ExpectedMove":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class DealerV2Analysis:
    regime: str
    intensity: str
    dealer_bias: str
    expected_hedging: str
    expected_volatility: str
    breakout_risk: str
    reversal_risk: str
    critical_level_proximity: str
    institutional_score: float
    confidence: float
    critical_level: float | None
    decision_factors: list[str]
    educational_action: str

    @classmethod
    def from_mapping(cls, values: Mapping[str, Any]) -> "DealerV2Analysis":
        return cls(**{field: values[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class InstitutionalAnalysis:
    options: pd.DataFrame
    by_strike: pd.DataFrame
    strike_table: pd.DataFrame
    summary: GammaSummary
    dealer: DealerAnalysis
    open_interest_summary: OpenInterestSummary
    gamma_v2_summary: GammaV2Summary
    gamma_exposure_summary: GammaExposureSummary
    gamma_exposure_by_strike: pd.DataFrame
    volatility_summary: VolatilitySummary
    expected_move: ExpectedMove
    volatility_curve: pd.DataFrame
    volatility_expiry_curve: pd.DataFrame
    dealer_v2: DealerV2Analysis
    commentary: str
    decision: str

    @property
    def row_count(self) -> int:
        return len(self.options)
