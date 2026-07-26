"""Institutional history route."""

import json
from typing import Any

from fastapi import APIRouter

from backend.database.repositories import load_institutional_history
from backend.schemas.history import HistoryRecord

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryRecord])
def history() -> list[HistoryRecord]:
    dataframe = load_institutional_history()
    records: list[dict[str, Any]] = json.loads(
        dataframe.to_json(orient="records", date_format="iso")
    )
    return [HistoryRecord.model_validate(record) for record in records]
