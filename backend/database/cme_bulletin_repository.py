"""SQLite persistence for confirmed CME bulletin metadata and normalized rows."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.database.connection import get_connection

CREATE_CME_BULLETIN_IMPORTS_SQL = """
CREATE TABLE IF NOT EXISTS cme_bulletin_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imported_at TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    bulletin_date TEXT,
    contract_count INTEGER NOT NULL,
    validation_status TEXT NOT NULL,
    eligibility TEXT NOT NULL,
    reprocessed_from_id INTEGER,
    metadata_json TEXT NOT NULL,
    report_json TEXT NOT NULL,
    eligibility_json TEXT NOT NULL,
    spot_alignment_json TEXT NOT NULL,
    contracts_json TEXT NOT NULL,
    open_interest_json TEXT,
    FOREIGN KEY (reprocessed_from_id) REFERENCES cme_bulletin_imports(id)
)
"""

CREATE_CME_HASH_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_cme_bulletin_imports_hash
ON cme_bulletin_imports(file_hash, imported_at DESC)
"""

CREATE_CME_DATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_cme_bulletin_imports_date
ON cme_bulletin_imports(bulletin_date DESC, imported_at DESC)
"""


def initialize_cme_bulletin_database(
    database_path: str | Path | None = None,
) -> None:
    with get_connection(database_path) as connection:
        connection.execute(CREATE_CME_BULLETIN_IMPORTS_SQL)
        connection.execute(CREATE_CME_HASH_INDEX_SQL)
        connection.execute(CREATE_CME_DATE_INDEX_SQL)
        connection.commit()


def find_latest_id_by_hash(
    file_hash: str,
    *,
    database_path: str | Path | None = None,
) -> int | None:
    initialize_cme_bulletin_database(database_path)
    with get_connection(database_path) as connection:
        row = connection.execute(
            """
            SELECT id
            FROM cme_bulletin_imports
            WHERE file_hash = ?
            ORDER BY imported_at DESC, id DESC
            LIMIT 1
            """,
            (file_hash,),
        ).fetchone()
    return int(row[0]) if row else None


def insert_cme_bulletin_import(
    payload: dict[str, Any],
    *,
    database_path: str | Path | None = None,
) -> int:
    initialize_cme_bulletin_database(database_path)
    with get_connection(database_path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO cme_bulletin_imports (
                imported_at,
                filename,
                file_hash,
                bulletin_date,
                contract_count,
                validation_status,
                eligibility,
                reprocessed_from_id,
                metadata_json,
                report_json,
                eligibility_json,
                spot_alignment_json,
                contracts_json,
                open_interest_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["imported_at"],
                payload["filename"],
                payload["file_hash"],
                payload["bulletin_date"],
                payload["contract_count"],
                payload["validation_status"],
                payload["eligibility"],
                payload.get("reprocessed_from_id"),
                json.dumps(payload["metadata"], ensure_ascii=False),
                json.dumps(payload["report"], ensure_ascii=False),
                json.dumps(payload["eligibility_report"], ensure_ascii=False),
                json.dumps(payload["spot_alignment"], ensure_ascii=False),
                json.dumps(payload["contracts"], ensure_ascii=False),
                (
                    json.dumps(
                        payload["open_interest_analysis"],
                        ensure_ascii=False,
                    )
                    if payload.get("open_interest_analysis") is not None
                    else None
                ),
            ),
        )
        connection.commit()
        if cursor.lastrowid is None:
            raise RuntimeError("SQLite não retornou o id da importação CME.")
        return int(cursor.lastrowid)


def get_latest_cme_bulletin_import(
    *,
    database_path: str | Path | None = None,
) -> dict[str, Any] | None:
    initialize_cme_bulletin_database(database_path)
    with get_connection(database_path) as connection:
        connection.row_factory = None
        row = connection.execute(
            """
            SELECT
                id,
                imported_at,
                filename,
                file_hash,
                bulletin_date,
                contract_count,
                validation_status,
                eligibility,
                reprocessed_from_id,
                metadata_json,
                report_json,
                eligibility_json,
                spot_alignment_json,
                contracts_json,
                open_interest_json
            FROM cme_bulletin_imports
            ORDER BY imported_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()
    if row is None:
        return None
    return {
        "id": int(row[0]),
        "imported_at": row[1],
        "filename": row[2],
        "file_hash": row[3],
        "bulletin_date": row[4],
        "contract_count": int(row[5]),
        "validation_status": row[6],
        "eligibility": row[7],
        "reprocessed_from_id": (
            int(row[8]) if row[8] is not None else None
        ),
        "metadata": json.loads(row[9]),
        "report": json.loads(row[10]),
        "eligibility_report": json.loads(row[11]),
        "spot_alignment": json.loads(row[12]),
        "contracts": json.loads(row[13]),
        "open_interest_analysis": (
            json.loads(row[14]) if row[14] else None
        ),
    }
