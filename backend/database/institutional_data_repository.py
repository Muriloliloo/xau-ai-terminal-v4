"""Persistence for the selected institutional data mode and CME snapshots."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from backend.database.connection import get_connection

CREATE_INSTITUTIONAL_STATE_SQL = """
CREATE TABLE IF NOT EXISTS institutional_data_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mode TEXT NOT NULL DEFAULT 'auto',
    updated_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
)
"""

CREATE_CME_SNAPSHOTS_SQL = """
CREATE TABLE IF NOT EXISTS cme_institutional_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    cme_import_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    source TEXT NOT NULL,
    freshness_type TEXT NOT NULL,
    bulletin_date TEXT,
    file_hash TEXT NOT NULL,
    contract_count INTEGER NOT NULL,
    call_count INTEGER NOT NULL,
    put_count INTEGER NOT NULL,
    open_interest_total REAL,
    call_open_interest REAL,
    put_open_interest REAL,
    volume_total REAL,
    eligibility TEXT NOT NULL,
    spot_provider TEXT,
    spot_timestamp TEXT,
    spot_alignment_json TEXT,
    available_metrics_json TEXT NOT NULL,
    unavailable_metrics_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL,
    analysis_json TEXT NOT NULL
)
"""

CREATE_CME_SNAPSHOTS_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_cme_institutional_snapshots_created
ON cme_institutional_snapshots(created_at DESC, id DESC)
"""


def initialize_institutional_data_database(
    database_path: str | Path | None = None,
) -> None:
    with get_connection(database_path) as connection:
        connection.execute(CREATE_INSTITUTIONAL_STATE_SQL)
        connection.execute(CREATE_CME_SNAPSHOTS_SQL)
        connection.execute(CREATE_CME_SNAPSHOTS_INDEX_SQL)
        connection.execute(
            "INSERT OR IGNORE INTO institutional_data_state (id, mode) VALUES (1, 'auto')"
        )
        connection.commit()


def get_institutional_mode(
    *, database_path: str | Path | None = None,
) -> str:
    initialize_institutional_data_database(database_path)
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT mode FROM institutional_data_state WHERE id = 1"
        ).fetchone()
    return str(row[0]) if row else "auto"


def set_institutional_mode(
    mode: str,
    *, database_path: str | Path | None = None,
) -> None:
    initialize_institutional_data_database(database_path)
    with get_connection(database_path) as connection:
        connection.execute(
            "UPDATE institutional_data_state SET mode = ?, "
            "updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now') "
            "WHERE id = 1",
            (mode,),
        )
        connection.commit()


def insert_cme_snapshot(
    payload: dict[str, Any],
    *, database_path: str | Path | None = None,
) -> int:
    initialize_institutional_data_database(database_path)
    with get_connection(database_path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO cme_institutional_snapshots (
                cme_import_id, provider, source, freshness_type, bulletin_date,
                file_hash, contract_count, call_count, put_count,
                open_interest_total, call_open_interest, put_open_interest,
                volume_total, eligibility, spot_provider, spot_timestamp,
                spot_alignment_json, available_metrics_json,
                unavailable_metrics_json, warnings_json, analysis_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["cme_import_id"], payload["provider"], payload["source"],
                payload["freshness_type"], payload.get("bulletin_date"),
                payload["file_hash"], payload["contract_count"],
                payload["call_count"], payload["put_count"],
                payload.get("open_interest_total"), payload.get("call_open_interest"),
                payload.get("put_open_interest"), payload.get("volume_total"),
                payload["eligibility"], payload.get("spot_provider"),
                payload.get("spot_timestamp"), json.dumps(payload.get("spot_alignment")),
                json.dumps(payload.get("available_metrics", [])),
                json.dumps(payload.get("unavailable_metrics", [])),
                json.dumps(payload.get("warnings", [])),
                json.dumps(payload.get("analysis", {}), ensure_ascii=False),
            ),
        )
        connection.commit()
        if cursor.lastrowid is None:
            raise RuntimeError("SQLite não retornou o id do snapshot CME.")
        return int(cursor.lastrowid)


def _snapshot_row(row: Any) -> dict[str, Any]:
    value = dict(row) if isinstance(row, sqlite3.Row) else dict(row)
    for field in (
        "spot_alignment_json", "available_metrics_json", "unavailable_metrics_json",
        "warnings_json", "analysis_json",
    ):
        raw = value.pop(field)
        value[field.removesuffix("_json")] = json.loads(raw) if raw else None
    return value


def list_cme_snapshots(
    *, limit: int = 100, database_path: str | Path | None = None,
) -> list[dict[str, Any]]:
    initialize_institutional_data_database(database_path)
    with get_connection(database_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM cme_institutional_snapshots ORDER BY created_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [_snapshot_row(row) for row in rows]


def get_cme_snapshot(
    snapshot_id: int, *, database_path: str | Path | None = None,
) -> dict[str, Any] | None:
    initialize_institutional_data_database(database_path)
    with get_connection(database_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM cme_institutional_snapshots WHERE id = ?",
            (snapshot_id,),
        ).fetchone()
        if row is None:
            return None
        return _snapshot_row(row)
