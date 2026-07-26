"""Controlled provider smoke test that never runs engines or writes snapshots."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime
from enum import Enum
from typing import Any

from backend.providers.provider_errors import ProviderError
from backend.providers.provider_factory import get_provider_factory


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


def _safe_metadata(metadata: Any) -> dict[str, Any]:
    payload = asdict(metadata)
    payload.pop("api_key", None)
    return payload


def main() -> int:
    factory = get_provider_factory()
    output: dict[str, Any] = {
        "selected_provider": factory.settings.provider,
        "api_key_configured": bool(
            factory.settings.alpha_vantage_api_key
        ),
        "providers": [
            _safe_metadata(metadata) for metadata in factory.statuses()
        ],
        "queries": {},
        "snapshots_modified": False,
    }

    try:
        resolution, spot = factory.execute(
            "spot",
            lambda provider: provider.get_spot(factory.settings.symbol),
        )
        output["queries"]["spot"] = {
            "provider": resolution.metadata.provider,
            "price": getattr(spot, "price", None),
            "currency": getattr(spot, "currency", None),
            "metadata": _safe_metadata(resolution.metadata),
        }
    except ProviderError as error:
        output["queries"]["spot"] = {
            "status": "unavailable",
            "message": str(error),
        }

    try:
        resolution, chain = factory.execute(
            "options",
            lambda provider: provider.get_option_chain(
                factory.settings.symbol
            ),
        )
        output["queries"]["options"] = {
            "provider": resolution.metadata.provider,
            "contracts": len(chain.contracts) if chain else 0,
            "strikes": (
                len({contract.strike for contract in chain.contracts})
                if chain
                else 0
            ),
            "metadata": _safe_metadata(resolution.metadata),
        }
    except ProviderError as error:
        output["queries"]["options"] = {
            "status": "unavailable",
            "message": str(error),
        }

    print(
        json.dumps(
            output,
            ensure_ascii=True,
            indent=2,
            default=_json_default,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
