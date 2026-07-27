"""Resolve the active institutional source without mixing data families."""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any, Literal

from backend.config import SAMPLE_CSV_PATH
from backend.database.institutional_data_repository import (
    get_cme_snapshot,
    get_cme_snapshot_by_import_id,
    get_institutional_mode,
    insert_cme_snapshot,
    list_cme_snapshots,
    set_institutional_mode,
)
from backend.providers.provider_factory import get_provider_factory
from backend.schemas.cme_bulletin import CmeBulletinImport
from backend.schemas.institutional import (
    InstitutionalDataMode,
    InstitutionalDataState,
    InstitutionalLatestResponse,
)
from backend.services.cme_bulletin_service import get_cme_bulletin_service
from backend.services.cme_bulletin_validator import align_spot

UNAVAILABLE_GAMMA = [
    "gamma",
    "gex",
    "gamma_flip",
    "gamma_magnet",
    "dealer_bias",
    "market_regime",
    "confidence",
    "gamma_call_wall",
    "gamma_put_wall",
    "iv",
    "expected_move",
]


def _allow_demo_fallback() -> bool:
    return os.getenv("ALLOW_DEMO_FALLBACK", "true").strip().lower() in {
        "1", "true", "yes", "on"
    }


def _spot_context() -> tuple[str | None, float | None, datetime | None, list[str]]:
    """Read spot only when Alpha Vantage is configured; never join it to CME rows."""
    factory = get_provider_factory()
    if not factory.settings.alpha_vantage_api_key:
        return "alpha_vantage", None, None, [
            "Spot Alpha Vantage não configurado; spot permanece indisponível."
        ]
    try:
        resolution, spot = factory.execute(
            "spot",
            lambda provider: provider.get_spot(factory.settings.symbol),
        )
        if spot is None:
            return "alpha_vantage", None, None, [
                "Spot Alpha Vantage indisponível para esta consulta."
            ]
        return (
            spot.metadata.provider,
            spot.price,
            spot.metadata.market_timestamp,
            list(resolution.metadata.warnings),
        )
    except Exception:  # provider failures must not affect CME data
        return "alpha_vantage", None, None, [
            "Spot separado Alpha Vantage indisponível nesta consulta."
        ]


def _cme_state(
    latest: CmeBulletinImport,
    *,
    mode: InstitutionalDataMode,
) -> InstitutionalDataState:
    oi = latest.open_interest_analysis
    spot_provider, spot_price, spot_timestamp, spot_warnings = _spot_context()
    spot_alignment = (
        align_spot(latest.metadata.bulletin_date, spot_timestamp)
        if spot_timestamp is not None
        else latest.spot_alignment
    )
    available = [
        "options",
        "open_interest",
        "volume",
        "settlement",
        "contract_count",
        "calls_puts",
        "expiration_distribution",
        "source_metadata",
    ]
    warnings = [*latest.metadata.warnings, *spot_warnings]
    return InstitutionalDataState(
        provider="cme_bulletin",
        source=latest.metadata.source,
        source_type="manual_pdf",
        freshness_type=latest.metadata.freshness_type,
        market_date=latest.metadata.bulletin_date,
        imported_at=latest.imported_at,
        spot_provider=spot_provider,
        spot_timestamp=spot_timestamp,
        spot_price=spot_price,
        cme_import_id=latest.id,
        data_mode="real_eod" if mode == "auto" else mode,
        fallback_active=False,
        is_demo=False,
        is_manual=True,
        is_partial=latest.metadata.is_partial,
        eligibility=latest.eligibility.status,
        available_metrics=available,
        unavailable_metrics=UNAVAILABLE_GAMMA,
        warnings=warnings,
        missing_fields=latest.metadata.missing_fields,
        contract_count=latest.contract_count,
        calls=latest.report.calls_found,
        puts=latest.report.puts_found,
        open_interest_total=oi.total_oi if oi else None,
        volume_total=oi.volume_total if oi else None,
        spot_alignment=spot_alignment,
    )


def _demo_state(mode: InstitutionalDataMode) -> InstitutionalDataState:
    enabled = _allow_demo_fallback() or mode == "demo"
    if not enabled:
        return InstitutionalDataState(
            data_mode="unavailable",
            fallback_active=False,
            warnings=[
                "Nenhum provider institucional confirmado e fallback demo desativado."
            ],
            missing_fields=["institutional_source"],
        )
    return InstitutionalDataState(
        provider="demo",
        source=SAMPLE_CSV_PATH.name,
        source_type="local_csv",
        freshness_type="demo",
        data_mode="demo",
        fallback_active=mode != "demo",
        is_demo=True,
        is_manual=False,
        is_partial=True,
        available_metrics=["options", "open_interest", "gamma", "gex", "volatility"],
        warnings=[
            "Modo demonstração explícito: sample_options.csv não representa mercado real."
        ] + (["Fallback demo ativado pelo modo automático."] if mode != "demo" else []),
        missing_fields=["live_spot", "market_timestamp"],
    )


def _configured_provider_state(
    mode: Literal["manual", "csv"],
) -> InstitutionalDataState | None:
    factory = get_provider_factory()
    provider = factory.registry.get(mode)
    if provider is None or not provider.is_available():
        return None
    metadata = provider.get_metadata(factory.settings.symbol)
    return InstitutionalDataState(
        provider=metadata.provider,
        source=metadata.source,
        source_type="provider",
        freshness_type=metadata.freshness_type,
        data_mode=mode,
        fallback_active=False,
        is_demo=metadata.is_demo,
        is_manual=metadata.is_manual,
        is_partial=metadata.is_partial,
        available_metrics=list(metadata.capabilities),
        warnings=list(metadata.warnings),
        missing_fields=list(metadata.missing_fields),
    )


def get_latest_cme() -> CmeBulletinImport | None:
    response = get_cme_bulletin_service().latest()
    return response.result if response.available else None


def get_institutional_state() -> InstitutionalDataState:
    mode = get_institutional_mode()
    if mode not in {"auto", "real_eod", "manual", "csv", "demo"}:
        mode = "auto"
    latest = get_latest_cme()
    if mode in {"auto", "real_eod"} and latest is not None:
        return _cme_state(latest, mode=mode)  # type: ignore[arg-type]
    if mode == "real_eod":
        return InstitutionalDataState(
            data_mode="unavailable",
            warnings=["Modo CME real selecionado, mas não há importação confirmada."],
            missing_fields=["cme_bulletin"],
        )
    if mode == "auto":
        for candidate in ("manual", "csv"):
            configured = _configured_provider_state(candidate)
            if configured is not None:
                return configured.model_copy(update={"fallback_active": False})
        return _demo_state(mode)  # type: ignore[arg-type]
    if mode == "demo":
        return _demo_state(mode)  # type: ignore[arg-type]
    configured = _configured_provider_state(mode)  # type: ignore[arg-type]
    if configured is not None:
        return configured
    return InstitutionalDataState(
        data_mode="unavailable",
        warnings=[f"Provider institucional {mode} indisponível."],
        missing_fields=["institutional_source"],
    )


def get_institutional_latest() -> InstitutionalLatestResponse:
    state = get_institutional_state()
    latest = get_latest_cme() if state.data_mode == "real_eod" else None
    return InstitutionalLatestResponse(
        state=state,
        available=latest is not None,
        latest=latest,
        open_interest=latest.open_interest_analysis if latest else None,
    )


def activate_mode(mode: InstitutionalDataMode) -> InstitutionalDataState:
    if mode == "real_eod" and get_latest_cme() is None:
        raise ValueError("Não há importação CME confirmada para ativar.")
    set_institutional_mode(mode)
    return get_institutional_state()


def create_cme_snapshot(
    latest: CmeBulletinImport | None = None,
    *,
    database_path: str | os.PathLike[str] | None = None,
) -> dict[str, Any]:
    """Persist the current CME import as the institutional timeline point.

    Confirmation passes the just-created import directly so this function can
    complete the provider pipeline even when the request uses an isolated test
    database.  The public manual snapshot endpoint remains compatible and is
    idempotent for an already-confirmed import.
    """
    if latest is None:
        latest = get_latest_cme()
    if latest is None:
        raise ValueError("Snapshot CME exige uma importação CME ativa.")

    # A confirmed bulletin is the explicit source of truth until the user
    # deliberately selects demo mode again.  This only changes source state;
    # no engine or formula is invoked here.
    set_institutional_mode("real_eod", database_path=database_path)
    state = _cme_state(latest, mode="real_eod")
    oi = latest.open_interest_analysis
    payload = {
        "cme_import_id": latest.id,
        "provider": latest.metadata.provider,
        "source": latest.metadata.source,
        "freshness_type": latest.metadata.freshness_type,
        "bulletin_date": latest.metadata.bulletin_date.isoformat()
        if latest.metadata.bulletin_date else None,
        "file_hash": latest.file_hash,
        "contract_count": latest.contract_count,
        "call_count": latest.report.calls_found,
        "put_count": latest.report.puts_found,
        "open_interest_total": oi.total_oi if oi else None,
        "call_open_interest": oi.call_oi_total if oi else None,
        "put_open_interest": oi.put_oi_total if oi else None,
        "volume_total": oi.volume_total if oi else None,
        "eligibility": latest.eligibility.status,
        "spot_provider": state.spot_provider,
        "spot_timestamp": state.spot_timestamp.isoformat()
        if state.spot_timestamp else None,
        "spot_alignment": latest.spot_alignment.model_dump(mode="json"),
        "available_metrics": state.available_metrics,
        "unavailable_metrics": state.unavailable_metrics,
        "warnings": state.warnings,
        "analysis": {
            "open_interest": oi.model_dump(mode="json") if oi else None,
            "metadata": latest.metadata.model_dump(mode="json"),
            "report": latest.report.model_dump(mode="json"),
            "eligibility": latest.eligibility.model_dump(mode="json"),
            "contracts": [contract.model_dump(mode="json") for contract in latest.contracts],
        },
    }
    existing = get_cme_snapshot_by_import_id(
        latest.id,
        database_path=database_path,
    )
    if existing is not None:
        return existing

    snapshot_id = insert_cme_snapshot(payload, database_path=database_path)
    return {"id": snapshot_id, "created_at": datetime.now(UTC), **payload}


def list_institutional_snapshots(limit: int = 100) -> list[dict[str, Any]]:
    return list_cme_snapshots(limit=limit)


def get_institutional_snapshot(snapshot_id: int) -> dict[str, Any] | None:
    return get_cme_snapshot(snapshot_id)
