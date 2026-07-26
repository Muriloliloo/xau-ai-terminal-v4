"""Analysis endpoint contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.schemas.market_data import DataMetadataResponse


class GexStrikeRow(BaseModel):
    strike: float
    call_gex: float
    put_gex: float
    net_gex: float
    open_interest: float
    volume: float


class OpenInterestSummaryResponse(BaseModel):
    call_oi_total: float
    put_oi_total: float
    net_oi: float
    largest_call_oi_strike: float | None
    largest_put_oi_strike: float | None
    new_oi_total: float
    reduced_oi_total: float
    largest_oi_increase_strike: float | None
    largest_oi_decrease_strike: float | None
    max_concentration_pct: float = Field(ge=0, le=100)
    has_previous_open_interest: bool


class OpenInterestStrikeResponse(BaseModel):
    rank: int = Field(ge=1)
    strike: float
    call_oi: float = Field(ge=0)
    put_oi: float = Field(ge=0)
    total_oi: float = Field(ge=0)
    net_oi: float
    percentage: float = Field(ge=0, le=100)


class OpenInterestAnalysisResponse(BaseModel):
    source_name: str
    source_mode: Literal["demo", "upload"]
    generated_at: datetime
    call_oi_total: float = Field(ge=0)
    put_oi_total: float = Field(ge=0)
    total_oi: float = Field(ge=0)
    net_oi: float
    largest_concentration_strike: float | None
    largest_concentration_pct: float = Field(ge=0, le=100)
    oi_concentration_score: float = Field(ge=0, le=100)
    top_10_strikes: list[OpenInterestStrikeResponse]
    distribution_by_strike: list[OpenInterestStrikeResponse]


class DealerOpenInterestContext(BaseModel):
    net_oi: float
    dominant_strike: float | None
    largest_concentration_pct: float = Field(ge=0, le=100)
    concentration_score: float = Field(ge=0, le=100)
    top_10_share_pct: float = Field(ge=0, le=100)


class GexConcentrationByRegion(BaseModel):
    below_flip: float = Field(ge=0, le=100)
    at_flip: float = Field(ge=0, le=100)
    above_flip: float = Field(ge=0, le=100)


class GammaSummaryV2Response(BaseModel):
    call_gex_total: float
    put_gex_total: float
    net_gex_total: float
    gross_gex_total: float = Field(ge=0)
    strongest_positive_gex_strike: float | None
    strongest_negative_gex_strike: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    call_wall: float | None
    put_wall: float | None
    distance_flip_to_call_wall: float | None
    distance_flip_to_put_wall: float | None
    gex_concentration_by_region: GexConcentrationByRegion
    regime_strength: str


class GammaExposureStrikeResponse(BaseModel):
    strike: float
    call_gex: float
    put_gex: float
    net_gex: float
    total_gex: float = Field(ge=0)
    cumulative_net_gex: float
    call_oi: float = Field(ge=0)
    put_oi: float = Field(ge=0)
    contribution_pct: float = Field(ge=0, le=100)
    dealer_pressure: str


class GammaExposureAnalysisResponse(BaseModel):
    source_name: str
    source_mode: Literal["demo", "upload"]
    generated_at: datetime
    call_gex: float
    put_gex: float
    net_gex: float
    total_gex: float = Field(ge=0)
    largest_positive_gex_strike: float | None
    largest_positive_gex: float
    largest_negative_gex_strike: float | None
    largest_negative_gex: float
    dealer_pressure: str
    dealer_pressure_score: float = Field(ge=-100, le=100)
    gamma_flip: float | None
    gamma_magnet: float | None
    gamma_source: Literal["provided", "estimated", "mixed"]
    contract_multiplier: int
    spot_adjusted: bool
    curve_by_strike: list[GammaExposureStrikeResponse]


class DealerGammaExposureContext(BaseModel):
    net_gex: float
    total_gex: float = Field(ge=0)
    dealer_pressure: str
    dealer_pressure_score: float = Field(ge=-100, le=100)
    largest_positive_gex_strike: float | None
    largest_negative_gex_strike: float | None


class VolatilitySummaryResponse(BaseModel):
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


class ExpectedMoveResponse(BaseModel):
    available: bool
    reason: str
    expected_move_points: float | None
    expected_move_pct: float | None
    upper_level: float | None
    lower_level: float | None
    expiry: str | None


class VolatilityCurveResponse(BaseModel):
    strike: float
    call_iv: float | None
    put_iv: float | None
    weighted_iv: float | None
    expiry: str | None


class VolatilityExpiryResponse(BaseModel):
    expiry: str | None
    call_iv: float | None
    put_iv: float | None
    weighted_iv: float | None
    minimum_iv: float | None
    maximum_iv: float | None


class VolatilityAnalysisResponse(BaseModel):
    source_name: str
    source_mode: Literal["demo", "upload"]
    generated_at: datetime
    volatility_summary: VolatilitySummaryResponse
    expected_move: ExpectedMoveResponse
    volatility_curve: list[VolatilityCurveResponse]
    expiry_curve: list[VolatilityExpiryResponse]
    iv_rank: None = None
    iv_percentile: None = None


class DealerReportV2Response(BaseModel):
    regime: str
    intensity: str
    dealer_bias: str
    expected_hedging: str
    expected_volatility: str
    breakout_risk: str
    reversal_risk: str
    critical_level_proximity: str
    institutional_score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=100)
    critical_level: float | None
    decision_factors: list[str]
    commentary: str
    educational_action: str
    open_interest_context: DealerOpenInterestContext | None = None
    gamma_exposure_context: DealerGammaExposureContext | None = None


class StrikeTableRow(GexStrikeRow):
    cumulative_gex: float
    call_oi: float
    put_oi: float
    net_oi: float
    previous_call_oi: float
    previous_put_oi: float
    call_oi_change: float
    put_oi_change: float
    concentration_pct: float = Field(ge=0, le=100)


class DealerReport(BaseModel):
    title: str
    regime: str
    explanation: str
    suggested_action: str
    risk_statement: str
    critical_level: float | None
    educational_notice: str


class AnalysisResponse(BaseModel):
    call_wall: float | None
    put_wall: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    gex_total: float
    regime: str
    dealer_bias: str
    confidence: float = Field(ge=0, le=100)
    volatility: str
    risk: str
    price: float | None = None
    price_change_percent: float | None = None
    commentary: str
    decision: str
    report: DealerReport
    alerts: list[str]
    gex_by_strike: list[GexStrikeRow]
    open_interest_summary: OpenInterestSummaryResponse
    open_interest_analysis: OpenInterestAnalysisResponse | None = None
    gamma_exposure_analysis: GammaExposureAnalysisResponse | None = None
    volatility_analysis: VolatilityAnalysisResponse | None = None
    gamma_summary: GammaSummaryV2Response
    dealer_report: DealerReportV2Response
    strike_table: list[StrikeTableRow]
    source_name: str
    source_mode: Literal["demo", "upload"]
    generated_at: datetime
    source_updated_at: datetime | None = None
    source_is_stale: bool = False
    snapshot_id: int | None = None
    snapshot_saved_automatically: bool = False
    data_metadata: DataMetadataResponse | None = None
