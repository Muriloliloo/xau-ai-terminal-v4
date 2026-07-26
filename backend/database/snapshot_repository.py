"""SQLite repository for full institutional snapshots."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from backend.core.snapshot_engine import SnapshotEngine, SnapshotMetadata
from backend.database.connection import get_connection

SUMMARY_COLUMNS = """
id, created_at, schema_version, source_name, source_mode, is_automatic, label,
call_wall, put_wall, gamma_flip, gamma_magnet, gex_total, net_oi, regime,
dealer_bias, confidence, institutional_score
"""


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(zip(row.keys(), row, strict=True))


def insert_snapshot(
    *,
    metadata: SnapshotMetadata,
    analysis_json: str,
    is_automatic: bool,
    label: str | None,
    database_path: str | Path | None = None,
) -> int:
    with get_connection(database_path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO institutional_snapshots (
                schema_version, source_name, source_mode, is_automatic, label,
                call_wall, put_wall, gamma_flip, gamma_magnet, gex_total,
                net_oi, regime, dealer_bias, confidence, institutional_score,
                analysis_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                SnapshotEngine.SCHEMA_VERSION,
                metadata.source_name,
                metadata.source_mode,
                int(is_automatic),
                label,
                metadata.call_wall,
                metadata.put_wall,
                metadata.gamma_flip,
                metadata.gamma_magnet,
                metadata.gex_total,
                metadata.net_oi,
                metadata.regime,
                metadata.dealer_bias,
                metadata.confidence,
                metadata.institutional_score,
                analysis_json,
            ),
        )
        connection.commit()
        if cursor.lastrowid is None:
            raise RuntimeError("SQLite não retornou o id do snapshot.")
        return int(cursor.lastrowid)


def list_snapshots(
    *,
    limit: int = 100,
    database_path: str | Path | None = None,
) -> list[dict[str, Any]]:
    with get_connection(database_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            f"""
            SELECT {SUMMARY_COLUMNS}
            FROM institutional_snapshots
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [_row_to_dict(row) for row in rows]


def get_snapshot(
    snapshot_id: int,
    *,
    database_path: str | Path | None = None,
) -> dict[str, Any] | None:
    with get_connection(database_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            f"""
            SELECT {SUMMARY_COLUMNS}, analysis_json
            FROM institutional_snapshots
            WHERE id = ?
            """,
            (snapshot_id,),
        ).fetchone()
    return None if row is None else _row_to_dict(row)


def delete_snapshot(
    snapshot_id: int,
    *,
    database_path: str | Path | None = None,
) -> bool:
    with get_connection(database_path) as connection:
        cursor = connection.execute(
            "DELETE FROM institutional_snapshots WHERE id = ?",
            (snapshot_id,),
        )
        connection.commit()
        return cursor.rowcount > 0
