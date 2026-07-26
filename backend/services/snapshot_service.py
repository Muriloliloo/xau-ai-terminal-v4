"""Application service for durable institutional snapshots."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from backend.core.snapshot_engine import SnapshotEngine
from backend.database.snapshot_repository import (
    delete_snapshot as delete_snapshot_record,
)
from backend.database.snapshot_repository import (
    get_snapshot as get_snapshot_record,
)
from backend.database.snapshot_repository import (
    insert_snapshot,
)
from backend.database.snapshot_repository import (
    list_snapshots as list_snapshot_records,
)
from backend.schemas.analysis import AnalysisResponse
from backend.schemas.snapshots import SnapshotDetail, SnapshotSummary


class SnapshotNotFoundError(LookupError):
    pass


def _analysis_mapping(
    analysis: AnalysisResponse | Mapping[str, Any],
) -> dict[str, Any]:
    if isinstance(analysis, AnalysisResponse):
        return analysis.model_dump(mode="json")
    return dict(analysis)


def _detail_from_record(record: dict[str, Any]) -> SnapshotDetail:
    payload = SnapshotEngine.deserialize(record.pop("analysis_json"))
    payload["snapshot_id"] = record["id"]
    payload["snapshot_saved_automatically"] = bool(record["is_automatic"])
    return SnapshotDetail(
        **record,
        analysis=AnalysisResponse.model_validate(payload),
    )


def create_snapshot(
    analysis: AnalysisResponse | Mapping[str, Any],
    *,
    is_automatic: bool,
    label: str | None = None,
) -> SnapshotDetail:
    payload = _analysis_mapping(analysis)
    clean_label = label.strip() if label and label.strip() else None
    metadata = SnapshotEngine.extract_metadata(payload)
    analysis_json = SnapshotEngine.serialize(payload)
    snapshot_id = insert_snapshot(
        metadata=metadata,
        analysis_json=analysis_json,
        is_automatic=is_automatic,
        label=clean_label,
    )
    record = get_snapshot_record(snapshot_id)
    if record is None:
        raise RuntimeError("Snapshot salvo não pôde ser relido.")
    return _detail_from_record(record)


def list_snapshots(*, limit: int = 100) -> list[SnapshotSummary]:
    return [
        SnapshotSummary.model_validate(record)
        for record in list_snapshot_records(limit=limit)
    ]


def get_snapshot(snapshot_id: int) -> SnapshotDetail:
    record = get_snapshot_record(snapshot_id)
    if record is None:
        raise SnapshotNotFoundError(f"Snapshot {snapshot_id} não encontrado.")
    return _detail_from_record(record)


def delete_snapshot(snapshot_id: int) -> None:
    if not delete_snapshot_record(snapshot_id):
        raise SnapshotNotFoundError(f"Snapshot {snapshot_id} não encontrado.")
