"""Gamma Exposure endpoint."""

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from backend.api.analysis import build_gamma_exposure_response
from backend.config import SAMPLE_CSV_PATH
from backend.schemas.analysis import GammaExposureAnalysisResponse
from backend.services.institutional_analysis_service import analyze_options

router = APIRouter(prefix="/gex", tags=["gamma-exposure"])


@router.get("", response_model=GammaExposureAnalysisResponse)
def get_gamma_exposure() -> GammaExposureAnalysisResponse:
    """Return the full GEX profile for the demonstrative CSV."""
    sample_path = Path(SAMPLE_CSV_PATH)
    try:
        return build_gamma_exposure_response(
            analyze_options(sample_path),
            source_name=sample_path.name,
            source_mode="demo",
            generated_at=datetime.now(UTC),
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
