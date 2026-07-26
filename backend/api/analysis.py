"""Institutional analysis routes."""

import json
import math
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.config import SAMPLE_CSV_PATH
from backend.core.alert_engine import build_alerts
from backend.models.analysis import InstitutionalAnalysis
from backend.schemas.analysis import (
    AnalysisResponse,
    DealerReport,
    DealerReportV2Response,
    GammaExposureAnalysisResponse,
    GammaExposureStrikeResponse,
    GammaSummaryV2Response,
    GexStrikeRow,
    OpenInterestAnalysisResponse,
    OpenInterestStrikeResponse,
    OpenInterestSummaryResponse,
    StrikeTableRow,
    VolatilityAnalysisResponse,
    VolatilityCurveResponse,
    VolatilityExpiryResponse,
    VolatilitySummaryResponse,
)
from backend.services.institutional_analysis_service import analyze_options
from backend.services.snapshot_service import create_snapshot

router = APIRouter(prefix="/analysis", tags=["analysis"])
STALE_SOURCE_AFTER = timedelta(hours=24)


def _legacy_summary(analysis: InstitutionalAnalysis) -> dict[str, float | None]:
    return {
        "Call Wall": analysis.summary.call_wall,
        "Put Wall": analysis.summary.put_wall,
        "Gamma Flip": analysis.summary.gamma_flip,
        "Gamma Magnet": analysis.summary.gamma_magnet,
        "GEX Total": analysis.summary.total_gex,
    }


def _legacy_dealer(analysis: InstitutionalAnalysis) -> dict[str, str | float]:
    return {
        "regime": analysis.dealer.regime,
        "dealer_bias": analysis.dealer.dealer_bias,
        "volatility": analysis.dealer.volatility,
        "confidence": analysis.dealer.confidence,
    }


def _strike_rows(analysis: InstitutionalAnalysis) -> list[GexStrikeRow]:
    records: list[dict[str, Any]] = json.loads(
        analysis.by_strike.to_json(orient="records")
    )
    return [GexStrikeRow.model_validate(record) for record in records]


def _strike_table_rows(analysis: InstitutionalAnalysis) -> list[StrikeTableRow]:
    records: list[dict[str, Any]] = json.loads(
        analysis.strike_table.to_json(orient="records")
    )
    return [StrikeTableRow.model_validate(record) for record in records]


def _open_interest_summary(
    analysis: InstitutionalAnalysis,
) -> OpenInterestSummaryResponse:
    return OpenInterestSummaryResponse.model_validate(
        analysis.open_interest_summary.__dict__
    )


def build_open_interest_response(
    analysis: InstitutionalAnalysis,
    *,
    source_name: str,
    source_mode: str,
    generated_at: datetime,
) -> OpenInterestAnalysisResponse:
    summary = analysis.open_interest_summary
    distribution = (
        analysis.strike_table[
            [
                "strike",
                "call_oi",
                "put_oi",
                "total_oi",
                "net_oi",
                "concentration_pct",
            ]
        ]
        .sort_values(["total_oi", "strike"], ascending=[False, True])
        .reset_index(drop=True)
    )
    distribution_rows = [
        OpenInterestStrikeResponse(
            rank=index + 1,
            strike=float(row.strike),
            call_oi=float(row.call_oi),
            put_oi=float(row.put_oi),
            total_oi=float(row.total_oi),
            net_oi=float(row.net_oi),
            percentage=float(row.concentration_pct),
        )
        for index, row in distribution.iterrows()
    ]
    return OpenInterestAnalysisResponse(
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
        call_oi_total=summary.call_oi_total,
        put_oi_total=summary.put_oi_total,
        total_oi=summary.total_oi,
        net_oi=summary.net_oi,
        largest_concentration_strike=summary.largest_concentration_strike,
        largest_concentration_pct=summary.max_concentration_pct,
        oi_concentration_score=summary.oi_concentration_score,
        top_10_strikes=[
            OpenInterestStrikeResponse.model_validate(row)
            for row in summary.top_10_strikes
        ],
        distribution_by_strike=distribution_rows,
    )


def _gamma_summary(analysis: InstitutionalAnalysis) -> GammaSummaryV2Response:
    return GammaSummaryV2Response.model_validate(
        analysis.gamma_v2_summary.__dict__
    )


def build_gamma_exposure_response(
    analysis: InstitutionalAnalysis,
    *,
    source_name: str,
    source_mode: str,
    generated_at: datetime,
) -> GammaExposureAnalysisResponse:
    summary = analysis.gamma_exposure_summary
    records: list[dict[str, Any]] = json.loads(
        analysis.gamma_exposure_by_strike.to_json(orient="records")
    )
    return GammaExposureAnalysisResponse(
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
        **summary.__dict__,
        curve_by_strike=[
            GammaExposureStrikeResponse.model_validate(record)
            for record in records
        ],
    )


def _percentage(value: float | None) -> float | None:
    if value is None or not math.isfinite(float(value)):
        return None
    return round(float(value) * 100, 6)


def _optional_string(value: Any) -> str | None:
    if value is None or (
        isinstance(value, float) and not math.isfinite(value)
    ):
        return None
    return str(value)


def build_volatility_response(
    analysis: InstitutionalAnalysis,
    *,
    source_name: str,
    source_mode: str,
    generated_at: datetime,
) -> VolatilityAnalysisResponse:
    summary = analysis.volatility_summary
    percentage_fields = {
        "weighted_iv",
        "call_iv",
        "put_iv",
        "iv_skew",
        "call_skew",
        "put_skew",
        "minimum_iv",
        "maximum_iv",
        "weighted_iv_change",
        "largest_iv_increase",
        "largest_iv_decrease",
    }
    summary_values = {
        field: (
            _percentage(getattr(summary, field))
            if field in percentage_fields
            else getattr(summary, field)
        )
        for field in summary.__dataclass_fields__
    }
    curve = [
        VolatilityCurveResponse(
            strike=float(row.strike),
            call_iv=_percentage(row.call_iv),
            put_iv=_percentage(row.put_iv),
            weighted_iv=_percentage(row.weighted_iv),
            expiry=_optional_string(row.expiry),
        )
        for row in analysis.volatility_curve.itertuples(index=False)
    ]
    expiry_curve = [
        VolatilityExpiryResponse(
            expiry=_optional_string(row.expiry),
            call_iv=_percentage(row.call_iv),
            put_iv=_percentage(row.put_iv),
            weighted_iv=_percentage(row.weighted_iv),
            minimum_iv=_percentage(row.minimum_iv),
            maximum_iv=_percentage(row.maximum_iv),
        )
        for row in analysis.volatility_expiry_curve.itertuples(index=False)
    ]
    return VolatilityAnalysisResponse(
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
        volatility_summary=VolatilitySummaryResponse(**summary_values),
        expected_move=analysis.expected_move.__dict__,
        volatility_curve=curve,
        expiry_curve=expiry_curve,
    )


def _dealer_report_v2(analysis: InstitutionalAnalysis) -> DealerReportV2Response:
    open_interest = analysis.open_interest_summary
    gamma_exposure = analysis.gamma_exposure_summary
    top_10_share = sum(
        float(row["percentage"]) for row in open_interest.top_10_strikes
    )
    report_values = {
        **analysis.dealer_v2.__dict__,
        "decision_factors": [
            *analysis.dealer_v2.decision_factors,
            (
                "OI Concentration Score: "
                f"{open_interest.oi_concentration_score:.2f}/100"
            ),
            (
                "GEX Dealer Pressure: "
                f"{gamma_exposure.dealer_pressure} "
                f"({gamma_exposure.dealer_pressure_score:.2f})"
            ),
        ],
    }
    return DealerReportV2Response(
        **report_values,
        commentary=analysis.commentary,
        open_interest_context={
            "net_oi": open_interest.net_oi,
            "dominant_strike": open_interest.largest_concentration_strike,
            "largest_concentration_pct": open_interest.max_concentration_pct,
            "concentration_score": open_interest.oi_concentration_score,
            "top_10_share_pct": min(100.0, top_10_share),
        },
        gamma_exposure_context={
            "net_gex": gamma_exposure.net_gex,
            "total_gex": gamma_exposure.total_gex,
            "dealer_pressure": gamma_exposure.dealer_pressure,
            "dealer_pressure_score": gamma_exposure.dealer_pressure_score,
            "largest_positive_gex_strike": (
                gamma_exposure.largest_positive_gex_strike
            ),
            "largest_negative_gex_strike": (
                gamma_exposure.largest_negative_gex_strike
            ),
        },
    )


def _build_report(analysis: InstitutionalAnalysis) -> DealerReport:
    return DealerReport(
        title="Dealer Report",
        regime=analysis.dealer.regime,
        explanation=analysis.commentary,
        suggested_action=(
            "Leitura educacional: o cenário favorece a abordagem indicada pelo engine — "
            f"{analysis.decision} A conclusão depende de confirmação e gestão de risco."
        ),
        risk_statement=(
            f"Nível de atenção: volatilidade {analysis.dealer.volatility.lower()}. "
            "A leitura representa maior probabilidade, não garantia de comportamento futuro."
        ),
        critical_level=analysis.summary.gamma_flip,
        educational_notice=(
            "Conteúdo educacional baseado no snapshot analisado; não constitui recomendação financeira."
        ),
    )


def _to_response(
    analysis: InstitutionalAnalysis,
    *,
    source_name: str,
    source_mode: str,
    generated_at: datetime,
    source_updated_at: datetime | None,
) -> AnalysisResponse:
    dealer = _legacy_dealer(analysis)
    alerts = build_alerts(_legacy_summary(analysis), dealer)
    source_is_stale = bool(
        source_updated_at and generated_at - source_updated_at > STALE_SOURCE_AFTER
    )
    open_interest_analysis = build_open_interest_response(
        analysis,
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
    )
    gamma_exposure_analysis = build_gamma_exposure_response(
        analysis,
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
    )
    volatility_analysis = build_volatility_response(
        analysis,
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
    )
    return AnalysisResponse(
        call_wall=analysis.summary.call_wall,
        put_wall=analysis.summary.put_wall,
        gamma_flip=analysis.summary.gamma_flip,
        gamma_magnet=analysis.summary.gamma_magnet,
        gex_total=analysis.summary.total_gex,
        regime=analysis.dealer.regime,
        dealer_bias=analysis.dealer.dealer_bias,
        confidence=analysis.dealer.confidence,
        volatility=analysis.dealer.volatility,
        risk=analysis.dealer.volatility,
        commentary=analysis.commentary,
        decision=analysis.decision,
        report=_build_report(analysis),
        alerts=alerts,
        gex_by_strike=_strike_rows(analysis),
        open_interest_summary=_open_interest_summary(analysis),
        open_interest_analysis=open_interest_analysis,
        gamma_exposure_analysis=gamma_exposure_analysis,
        volatility_analysis=volatility_analysis,
        gamma_summary=_gamma_summary(analysis),
        dealer_report=_dealer_report_v2(analysis),
        strike_table=_strike_table_rows(analysis),
        source_name=source_name,
        source_mode=source_mode,
        generated_at=generated_at,
        source_updated_at=source_updated_at,
        source_is_stale=source_is_stale,
    )


def _analyze(
    source: Any,
    *,
    source_name: str,
    source_mode: str,
    source_updated_at: datetime | None = None,
) -> AnalysisResponse:
    try:
        response = _to_response(
            analyze_options(source),
            source_name=source_name,
            source_mode=source_mode,
            generated_at=datetime.now(UTC),
            source_updated_at=source_updated_at,
        )
        snapshot = create_snapshot(response, is_automatic=True)
        return response.model_copy(
            update={
                "snapshot_id": snapshot.id,
                "snapshot_saved_automatically": True,
            }
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


@router.post("/demo", response_model=AnalysisResponse)
def analyze_demo() -> AnalysisResponse:
    sample_path = Path(SAMPLE_CSV_PATH)
    sample_updated_at = (
        datetime.fromtimestamp(sample_path.stat().st_mtime, tz=UTC)
        if sample_path.exists()
        else None
    )
    return _analyze(
        sample_path,
        source_name=sample_path.name,
        source_mode="demo",
        source_updated_at=sample_updated_at,
    )


@router.post("/upload", response_model=AnalysisResponse)
def analyze_upload(file: Annotated[UploadFile, File(...)]) -> AnalysisResponse:
    source_name = file.filename or "upload.csv"
    if not source_name.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="O arquivo enviado deve possuir extensão .csv.",
        )
    return _analyze(
        file.file,
        source_name=Path(source_name).name,
        source_mode="upload",
    )
