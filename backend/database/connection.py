"""SQLite connection lifecycle and schema initialization."""

import sqlite3
from pathlib import Path

from backend.config import DATABASE_PATH

CREATE_INSTITUTIONAL_LEVELS_SQL = """
CREATE TABLE IF NOT EXISTS institutional_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    call_wall REAL,
    put_wall REAL,
    gamma_flip REAL,
    gamma_magnet REAL,
    gex_total REAL,
    regime TEXT,
    dealer_bias TEXT,
    confidence REAL
)
"""

CREATE_INSTITUTIONAL_SNAPSHOTS_SQL = """
CREATE TABLE IF NOT EXISTS institutional_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (
        STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
    ),
    schema_version INTEGER NOT NULL DEFAULT 1,
    source_name TEXT NOT NULL,
    source_mode TEXT NOT NULL CHECK (source_mode IN ('demo', 'upload')),
    is_automatic INTEGER NOT NULL DEFAULT 1 CHECK (is_automatic IN (0, 1)),
    label TEXT,
    call_wall REAL,
    put_wall REAL,
    gamma_flip REAL,
    gamma_magnet REAL,
    gex_total REAL NOT NULL,
    net_oi REAL NOT NULL,
    regime TEXT NOT NULL,
    dealer_bias TEXT NOT NULL,
    confidence REAL NOT NULL,
    institutional_score REAL NOT NULL,
    analysis_json TEXT NOT NULL
)
"""

CREATE_SNAPSHOTS_CREATED_AT_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_institutional_snapshots_created_at
ON institutional_snapshots(created_at DESC, id DESC)
"""

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


def get_connection(database_path: str | Path | None = None) -> sqlite3.Connection:
    path = Path(database_path) if database_path is not None else DATABASE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(path)


def initialize_database(database_path: str | Path | None = None) -> None:
    with get_connection(database_path) as connection:
        connection.execute(CREATE_INSTITUTIONAL_LEVELS_SQL)
        connection.execute(CREATE_INSTITUTIONAL_SNAPSHOTS_SQL)
        connection.execute(CREATE_SNAPSHOTS_CREATED_AT_INDEX_SQL)
        connection.execute(CREATE_CME_BULLETIN_IMPORTS_SQL)
        connection.execute(CREATE_CME_HASH_INDEX_SQL)
        connection.execute(CREATE_CME_DATE_INDEX_SQL)
        connection.commit()
