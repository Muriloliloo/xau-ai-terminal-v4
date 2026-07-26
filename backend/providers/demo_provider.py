"""Preserved demonstrative CSV provider."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path

from backend.config import SAMPLE_CSV_PATH
from backend.providers.interface_provider import MarketDataProvider
from backend.providers.manual_options_provider import ManualOptionsProvider
from backend.providers.models import (
    FreshnessType,
    NormalizedMarketData,
    NormalizedOptionChain,
    NormalizedSpot,
    ProviderHealth,
    ProviderMetadata,
    ProviderState,
)


class DemoProvider(MarketDataProvider):
    def __init__(self, path: str | Path = SAMPLE_CSV_PATH) -> None:
        self.path = Path(path)
        self._chain: NormalizedOptionChain | None = None

    def _load(self, symbol: str) -> NormalizedOptionChain:
        if self._chain is not None:
            return self._chain
        if not self.path.exists():
            raise FileNotFoundError("Arquivo demonstrativo não disponível.")
        validator = ManualOptionsProvider()
        with self.path.open("rb") as source:
            result = validator.validate(
                source,
                filename=self.path.name,
                symbol=symbol,
            )
        if result.chain is None:
            raise ValueError("Arquivo demonstrativo inválido.")
        retrieved_at = datetime.now(UTC)
        market_timestamp = result.chain.metadata.market_timestamp
        metadata = replace(
            result.chain.metadata,
            provider="demo",
            source=self.path.name,
            retrieved_at=retrieved_at,
            market_timestamp=market_timestamp,
            delay_minutes=result.chain.metadata.delay_minutes,
            freshness_type=FreshnessType.DEMO,
            is_demo=True,
            is_manual=False,
            warnings=(
                "Dados demonstrativos; não representam o mercado atual.",
            ),
            status=ProviderState.READY,
            capabilities=(
                "options",
                *(
                    ("spot",)
                    if any(
                        contract.underlying_price is not None
                        for contract in result.chain.contracts
                    )
                    else ()
                ),
            ),
        )
        self._chain = NormalizedOptionChain(result.chain.contracts, metadata)
        return self._chain

    def get_metadata(self, symbol: str = "XAU") -> ProviderMetadata:
        try:
            return self._load(symbol).metadata
        except (FileNotFoundError, ValueError):
            now = datetime.now(UTC)
            return ProviderMetadata(
                provider="demo",
                source=self.path.name,
                symbol=symbol,
                retrieved_at=now,
                market_timestamp=None,
                delay_minutes=None,
                freshness_type=FreshnessType.UNAVAILABLE,
                is_demo=True,
                is_manual=False,
                is_partial=True,
                warnings=("CSV demonstrativo indisponível.",),
                missing_fields=("option_chain",),
                status=ProviderState.UNAVAILABLE,
                capabilities=("options",),
            )

    def is_available(self) -> bool:
        return self.path.is_file()

    def get_spot(self, symbol: str = "XAU") -> NormalizedSpot | None:
        return None

    def get_option_chain(
        self,
        symbol: str = "XAU",
    ) -> NormalizedOptionChain | None:
        return self._load(symbol)

    def get_market_snapshot(self, symbol: str = "XAU") -> NormalizedMarketData:
        chain = self.get_option_chain(symbol)
        return NormalizedMarketData(
            metadata=chain.metadata,
            option_chain=chain,
        )

    def get_health(self) -> ProviderHealth:
        available = self.is_available()
        return ProviderHealth(
            provider="demo",
            available=available,
            status=ProviderState.READY if available else ProviderState.UNAVAILABLE,
            message=(
                "CSV demonstrativo disponível."
                if available
                else "CSV demonstrativo indisponível."
            ),
            checked_at=datetime.now(UTC),
        )
