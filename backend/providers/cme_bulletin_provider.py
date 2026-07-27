"""Manual end-of-day provider backed by a confirmed CME bulletin import."""

from __future__ import annotations

from datetime import UTC, datetime
from threading import RLock

from backend.providers.interface_provider import MarketDataProvider
from backend.providers.models import (
    FreshnessType,
    NormalizedMarketData,
    NormalizedOptionChain,
    NormalizedOptionContract,
    NormalizedSpot,
    ProviderHealth,
    ProviderMetadata,
    ProviderState,
)
from backend.schemas.cme_bulletin import CmeBulletinImport


class CmeBulletinProvider(MarketDataProvider):
    """Expose only confirmed data; the existing provider factory is untouched."""

    def __init__(self) -> None:
        self._latest: CmeBulletinImport | None = None
        self._lock = RLock()

    def confirm(self, result: CmeBulletinImport) -> None:
        with self._lock:
            self._latest = result

    def latest(self) -> CmeBulletinImport | None:
        with self._lock:
            return self._latest

    def get_metadata(self, symbol: str = "GC") -> ProviderMetadata:
        latest = self.latest()
        if latest is None:
            now = datetime.now(UTC)
            return ProviderMetadata(
                provider="cme_bulletin",
                source="CME Group Daily Information Bulletin — Section 64",
                symbol=symbol,
                retrieved_at=now,
                market_timestamp=None,
                delay_minutes=None,
                freshness_type=FreshnessType.UNAVAILABLE,
                is_demo=False,
                is_manual=True,
                is_partial=True,
                warnings=("Nenhum boletim CME confirmado nesta execução.",),
                missing_fields=("option_chain",),
                status=ProviderState.UNAVAILABLE,
                capabilities=(
                    "options",
                    "open_interest",
                    "volume",
                    "settlement",
                    "end_of_day",
                    "manual_import",
                ),
            )
        metadata = latest.metadata
        return ProviderMetadata(
            provider=metadata.provider,
            source=metadata.source,
            symbol=symbol,
            retrieved_at=metadata.retrieved_at,
            market_timestamp=metadata.market_timestamp,
            delay_minutes=None,
            freshness_type=FreshnessType.END_OF_DAY,
            is_demo=False,
            is_manual=True,
            is_partial=metadata.is_partial,
            warnings=tuple(metadata.warnings),
            missing_fields=tuple(metadata.missing_fields),
            status=ProviderState.READY,
            last_success=latest.imported_at,
            known_limit=(
                "Fechamento diário manual; sem Gamma, IV ou spot no boletim."
            ),
            capabilities=tuple(metadata.capabilities),
        )

    def is_available(self) -> bool:
        return self.latest() is not None

    def get_spot(self, symbol: str = "GC") -> NormalizedSpot | None:
        return None

    def get_option_chain(
        self,
        symbol: str = "GC",
    ) -> NormalizedOptionChain | None:
        latest = self.latest()
        if latest is None:
            return None
        metadata = self.get_metadata(symbol)
        normalized: list[NormalizedOptionContract] = []
        for contract in latest.contracts:
            # The existing canonical contract requires explicit volume and OI.
            # Partial rows remain available through the CME-specific endpoint.
            if contract.volume is None or contract.open_interest is None:
                continue
            previous_open_interest = None
            if contract.open_interest_change is not None:
                candidate = (
                    contract.open_interest - contract.open_interest_change
                )
                if candidate >= 0:
                    previous_open_interest = candidate
            normalized.append(
                NormalizedOptionContract(
                    symbol=symbol,
                    expiration=contract.expiration,
                    strike=contract.strike,
                    option_type=contract.option_type,
                    bid=None,
                    ask=None,
                    last=None,
                    volume=contract.volume,
                    open_interest=contract.open_interest,
                    previous_open_interest=previous_open_interest,
                    implied_volatility=None,
                    previous_iv=None,
                    delta=contract.delta,
                    gamma=None,
                    theta=None,
                    vega=None,
                    underlying_price=None,
                    timestamp=metadata.market_timestamp,
                    source=contract.source,
                    aggressor=None,
                    days_to_expiry=None,
                )
            )
        return NormalizedOptionChain(
            contracts=tuple(normalized),
            metadata=metadata,
        )

    def get_market_snapshot(self, symbol: str = "GC") -> NormalizedMarketData:
        return NormalizedMarketData(
            metadata=self.get_metadata(symbol),
            spot=None,
            option_chain=self.get_option_chain(symbol),
        )

    def get_health(self) -> ProviderHealth:
        available = self.is_available()
        return ProviderHealth(
            provider="cme_bulletin",
            available=available,
            status=(
                ProviderState.READY
                if available
                else ProviderState.UNAVAILABLE
            ),
            message=(
                "Boletim CME de fechamento disponível."
                if available
                else "Nenhum boletim CME confirmado."
            ),
            checked_at=datetime.now(UTC),
        )
