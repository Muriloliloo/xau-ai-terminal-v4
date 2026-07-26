"""History endpoint contracts."""

from pydantic import BaseModel


class HistoryRecord(BaseModel):
    id: int
    created_at: str | None = None
    call_wall: float | None = None
    put_wall: float | None = None
    gamma_flip: float | None = None
    gamma_magnet: float | None = None
    gex_total: float | None = None
    regime: str | None = None
    dealer_bias: str | None = None
    confidence: float | None = None
