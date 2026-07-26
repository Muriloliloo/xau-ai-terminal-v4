"""Open Interest analysis route for the configured demonstration snapshot."""

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from backend.api.analysis import build_open_interest_response
from backend.api.errors import MISSING_SAMPLE_CSV_DETAIL
from backend.config import SAMPLE_CSV_PATH
from backend.schemas.analysis import OpenInterestAnalysisResponse
from backend.services.institutional_analysis_service import analyze_options

router = APIRouter(prefix="/open-interest", tags=["open-interest"])


@router.get("", response_model=OpenInterestAnalysisResponse)
def open_interest() -> OpenInterestAnalysisResponse:
    sample_path = Path(SAMPLE_CSV_PATH)
    try:
        analysis = analyze_options(sample_path)
        return build_open_interest_response(
            analysis,
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
