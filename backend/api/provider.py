"""Provider status endpoints used by the Dashboard and System page."""

from __future__ import annotations

from fastapi import APIRouter

from backend.database.institutional_data_repository import (
    get_cme_snapshot_by_import_id,
)
from backend.schemas.provider import CurrentProviderResponse
from backend.services.cme_bulletin_service import get_cme_bulletin_service
from backend.services.institutional_data_service import get_institutional_state

router = APIRouter(prefix="/provider", tags=["provider"])


@router.get("/current", response_model=CurrentProviderResponse)
def current_provider() -> CurrentProviderResponse:
    """Return the active source and the snapshot generated from it."""
    service = get_cme_bulletin_service()
    latest_response = service.latest()
    state = get_institutional_state()
    latest = latest_response.result if latest_response.available else None
    snapshot = (
        get_cme_snapshot_by_import_id(
            latest.id,
            database_path=service.database_path,
        )
        if latest is not None
        else None
    )
    if latest is not None and (
        state.provider == "cme_bulletin" or snapshot is not None
    ):
        oi = latest.open_interest_analysis
        return CurrentProviderResponse(
            provider="cme_bulletin",
            origin="cme_pdf",
            market_date=latest.metadata.bulletin_date,
            last_updated=latest.imported_at,
            snapshot_id=int(snapshot["id"]) if snapshot else None,
            snapshot=snapshot,
            contract_count=latest.contract_count,
            calls=latest.report.calls_found,
            puts=latest.report.puts_found,
            open_interest_total=oi.total_oi if oi else None,
            volume_total=oi.volume_total if oi else None,
            is_demo=False,
            available=True,
        )

    return CurrentProviderResponse(
        provider=state.provider or "unavailable",
        origin=state.source,
        market_date=state.market_date,
        last_updated=state.imported_at,
        snapshot_id=state.cme_import_id if state.provider == "cme_bulletin" else None,
        contract_count=state.contract_count,
        calls=state.calls,
        puts=state.puts,
        open_interest_total=state.open_interest_total,
        volume_total=state.volume_total,
        is_demo=state.is_demo,
        available=state.provider is not None and not state.is_demo,
    )
