"""Common contract implemented by every market-data provider."""

from __future__ import annotations

from abc import ABC, abstractmethod

from backend.providers.models import (
    NormalizedMarketData,
    NormalizedOptionChain,
    NormalizedSpot,
    ProviderHealth,
    ProviderMetadata,
)


class MarketDataProvider(ABC):
    @abstractmethod
    def get_metadata(self, symbol: str = "XAU") -> ProviderMetadata:
        raise NotImplementedError

    @abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_spot(self, symbol: str = "XAU") -> NormalizedSpot | None:
        raise NotImplementedError

    @abstractmethod
    def get_market_snapshot(
        self,
        symbol: str = "XAU",
    ) -> NormalizedMarketData:
        raise NotImplementedError

    @abstractmethod
    def get_option_chain(
        self,
        symbol: str = "XAU",
    ) -> NormalizedOptionChain | None:
        raise NotImplementedError

    @abstractmethod
    def get_health(self) -> ProviderHealth:
        raise NotImplementedError
