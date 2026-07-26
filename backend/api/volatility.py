"""Implied-volatility endpoint."""

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from backend.api.analysis import build_volatility_response
from backend.api.errors import MISSING_SAMPLE_CSV_DETAIL
from backend.config import SAMPLE_CSV_PATH
from backend.schemas.analysis import VolatilityAnalysisResponse
from backend.services.institutional_analysis_service import analyze_options

router = APIRouter(prefix="/volatility", tags=["volatility"])


@router.get("", response_model=VolatilityAnalysisResponse)
def get_volatility() -> VolatilityAnalysisResponse:
    """Return IV analytics for the demonstrative CSV without saving a snapshot."""
    sample_path = Path(SAMPLE_CSV_PATH)
    try:
        return build_volatility_response(
            analyze_options(sample_path),
            source_name=sample_path.name,
            source_mode="demo",
            generated_at=datetime.now(UTC),
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_SAMPLE_CSV_DETAIL,
        ) from error
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
