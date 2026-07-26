"""TradingView-compatible JSON export."""

import json
from pathlib import Path
from typing import Any


def export_levels(payload: Any, output_path: str | Path) -> Path:
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return destination
