"""Read operations for institutional analysis history."""

import pandas as pd

from backend.database.connection import get_connection


def load_institutional_history() -> pd.DataFrame:
    with get_connection() as connection:
        return pd.read_sql(
            "SELECT * FROM institutional_levels ORDER BY id DESC",
            connection,
        )
