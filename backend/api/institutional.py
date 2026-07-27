"""Active institutional source and CME snapshot endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from backend.schemas.institutional import (
    InstitutionalDataState,
    InstitutionalLatestResponse,
    InstitutionalModeRequest,
    InstitutionalModeResponse,
)
from backend.services.institutional_data_service import (
    activate_mode,
    create_cme_snapshot,
    get_institutional_latest,
    get_institutional_snapshot,
    get_institutional_state,
    list_institutional_snapshots,
)

router = APIRouter(prefix="/market/institutional", tags=["institutional-data"])


@router.get("/status", response_model=InstitutionalDataState)
def institutional_status() -> InstitutionalDataState:
    return get_institutional_state()


@router.get("/latest", response_model=InstitutionalLatestResponse)
def institutional_latest() -> InstitutionalLatestResponse:
    return get_institutional_latest()


@router.post("/mode", response_model=InstitutionalModeResponse)
def institutional_mode(request: InstitutionalModeRequest) -> InstitutionalModeResponse:
    try:
        state = activate_mode(request.mode)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    return InstitutionalModeResponse(state=state)


@router.post("/activate", response_model=InstitutionalModeResponse)
def institutional_activate(
    request: InstitutionalModeRequest,
) -> InstitutionalModeResponse:
    return institutional_mode(request)


@router.post("/snapshots", status_code=status.HTTP_201_CREATED)
def create_institutional_snapshot() -> dict:
    try:
        return create_cme_snapshot()
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.get("/snapshots")
def institutional_snapshots(
    limit: int = Query(default=100, ge=1, le=500),
) -> list[dict]:
    return list_institutional_snapshots(limit=limit)


@router.get("/snapshots/{snapshot_id}")
def institutional_snapshot(snapshot_id: int) -> dict:
    result = get_institutional_snapshot(snapshot_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Snapshot CME não encontrado.")
    return result
