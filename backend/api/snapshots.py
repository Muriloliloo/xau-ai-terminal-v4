"""Institutional snapshot routes."""

from fastapi import APIRouter, HTTPException, Query, Response, status

from backend.schemas.snapshots import (
    SnapshotCreateRequest,
    SnapshotDetail,
    SnapshotSummary,
)
from backend.services.snapshot_service import (
    SnapshotNotFoundError,
    create_snapshot,
    delete_snapshot,
    get_snapshot,
    list_snapshots,
)

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.get("", response_model=list[SnapshotSummary])
def snapshots(limit: int = Query(default=100, ge=1, le=500)) -> list[SnapshotSummary]:
    return list_snapshots(limit=limit)


@router.post(
    "/create",
    response_model=SnapshotDetail,
    status_code=status.HTTP_201_CREATED,
)
def create(request: SnapshotCreateRequest) -> SnapshotDetail:
    return create_snapshot(
        request.analysis,
        is_automatic=False,
        label=request.label,
    )


@router.get("/{snapshot_id}", response_model=SnapshotDetail)
def snapshot(snapshot_id: int) -> SnapshotDetail:
    try:
        return get_snapshot(snapshot_id)
    except SnapshotNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.delete("/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(snapshot_id: int) -> Response:
    try:
        delete_snapshot(snapshot_id)
    except SnapshotNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
