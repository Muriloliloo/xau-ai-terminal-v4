"""Registry for market-data providers."""

from __future__ import annotations

from threading import RLock

from backend.providers.interface_provider import MarketDataProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, MarketDataProvider] = {}
        self._lock = RLock()

    def register(self, name: str, provider: MarketDataProvider) -> None:
        with self._lock:
            self._providers[name.strip().lower()] = provider

    def get(self, name: str) -> MarketDataProvider | None:
        with self._lock:
            return self._providers.get(name.strip().lower())

    def all(self) -> dict[str, MarketDataProvider]:
        with self._lock:
            return dict(self._providers)
