"""Authorized local CSV provider, distinct from the bundled demo file."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from backend.providers.demo_provider import DemoProvider
from backend.providers.models import (
    FreshnessType,
    NormalizedOptionChain,
    ProviderMetadata,
    ProviderState,
)


class CsvProvider(DemoProvider):
    def __init__(self, path: str | Path | None) -> None:
        self.path = Path(path) if path else Path("__csv_not_configured__")
        self._chain: NormalizedOptionChain | None = None
        self._configured = path is not None

    def _load(self, symbol: str) -> NormalizedOptionChain:
        chain = super()._load(symbol)
        metadata = replace(
            chain.metadata,
            provider="csv",
            freshness_type=FreshnessType.MANUAL,
            is_demo=False,
            is_manual=True,
            warnings=(
                "Arquivo local autorizado; atualidade depende da exportação.",
            ),
            capabilities=(
                *chain.metadata.capabilities,
                "authorized_local_file",
            ),
        )
        self._chain = NormalizedOptionChain(chain.contracts, metadata)
        return self._chain

    def get_metadata(self, symbol: str = "XAU") -> ProviderMetadata:
        if not self._configured:
            now = datetime.now(UTC)
            return ProviderMetadata(
                provider="csv",
                source="arquivo local não configurado",
                symbol=symbol,
                retrieved_at=now,
                market_timestamp=None,
                delay_minutes=None,
                freshness_type=FreshnessType.UNAVAILABLE,
                is_demo=False,
                is_manual=True,
                is_partial=True,
                warnings=("MARKET_DATA_CSV_PATH não configurado.",),
                missing_fields=("option_chain",),
                status=ProviderState.UNAVAILABLE,
                capabilities=("options", "authorized_local_file"),
            )
        return super().get_metadata(symbol)

    def is_available(self) -> bool:
        return self._configured and self.path.is_file()
