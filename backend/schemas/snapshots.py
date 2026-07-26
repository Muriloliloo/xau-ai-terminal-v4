"""Snapshot endpoint contracts."""

from typing import Literal

from pydantic import BaseModel, Field

from backend.schemas.analysis import AnalysisResponse
from backend.schemas.market_data import DataMetadataResponse


class SnapshotCreateRequest(BaseModel):
    analysis: AnalysisResponse
    label: str | None = Field(default=None, max_length=120)


class SnapshotSummary(BaseModel):
    id: int
    created_at: str
    schema_version: int
    source_name: str
    source_mode: Literal["demo", "upload"]
    is_automatic: bool
    label: str | None = None
    call_wall: float | None
    put_wall: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    gex_total: float
    net_oi: float
    regime: str
    dealer_bias: str
    confidence: float = Field(ge=0, le=100)
    institutional_score: float = Field(ge=0, le=100)
    data_metadata: DataMetadataResponse | None = None


class SnapshotDetail(SnapshotSummary):
    analysis: AnalysisResponse
