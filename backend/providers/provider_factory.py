"""Provider selection with explicit, observable fallback rules."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, replace
from threading import RLock
from typing import TypeVar

from backend.config import MarketDataSettings
from backend.providers.alpha_vantage_provider import AlphaVantageProvider
from backend.providers.csv_provider import CsvProvider
from backend.providers.demo_provider import DemoProvider
from backend.providers.interface_provider import MarketDataProvider
from backend.providers.manual_options_provider import ManualOptionsProvider
from backend.providers.models import ProviderMetadata
from backend.providers.provider_cache import ProviderCache
from backend.providers.provider_errors import (
    ProviderError,
    ProviderNotConfiguredError,
)
from backend.providers.provider_registry import ProviderRegistry

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProviderResolution:
    provider: MarketDataProvider
    metadata: ProviderMetadata
    requested_provider: str
    fallback_used: bool


ResultT = TypeVar("ResultT")


class MarketDataProviderFactory:
    def __init__(
        self,
        settings: MarketDataSettings,
        registry: ProviderRegistry,
    ) -> None:
        self.settings = settings
        self.registry = registry

    def candidates(self, capability: str) -> list[str]:
        selected = self.settings.provider
        if selected == "auto":
            order = (
                ["alpha_vantage", "manual", "csv", "demo"]
                if capability in {"spot", "daily_history"}
                else ["manual", "csv", "demo"]
            )
        else:
            fallback_order = ["manual", "csv", "demo"]
            order = [selected, *[name for name in fallback_order if name != selected]]
        return order if self.settings.allow_demo_fallback else order[:1]

    def resolve(self, capability: str) -> ProviderResolution:
        requested = self.settings.provider
        for name in self.candidates(capability):
            provider = self.registry.get(name)
            if provider is None or not provider.is_available():
                continue
            metadata = provider.get_metadata(self.settings.symbol)
            if capability not in metadata.capabilities:
                continue
            fallback = name == "demo" or (
                requested != "auto" and name != requested
            )
            if fallback:
                metadata = replace(
                    metadata,
                    fallback_used=True,
                    warnings=(
                        *metadata.warnings,
                        f"Fallback ativo: {requested} → {name}.",
                    ),
                )
            return ProviderResolution(
                provider=provider,
                metadata=metadata,
                requested_provider=requested,
                fallback_used=fallback,
            )
        raise ProviderNotConfiguredError(
            f"Provider com capacidade {capability}",
        )

    def execute(
        self,
        capability: str,
        operation: Callable[[MarketDataProvider], ResultT],
    ) -> tuple[ProviderResolution, ResultT]:
        requested = self.settings.provider
        last_error: ProviderError | None = None
        failed_provider: str | None = None
        for name in self.candidates(capability):
            provider = self.registry.get(name)
            if provider is None or not provider.is_available():
                continue
            metadata = provider.get_metadata(self.settings.symbol)
            if capability not in metadata.capabilities:
                continue
            try:
                result = operation(provider)
            except ProviderError as error:
                last_error = error
                failed_provider = name
                logger.warning(
                    "market_data_provider_failed provider=%s capability=%s code=%s",
                    name,
                    capability,
                    error.code,
                )
                continue
            except (FileNotFoundError, TypeError, ValueError):
                last_error = ProviderError(
                    f"{name} não pôde fornecer dados válidos.",
                    code="provider_local_data_error",
                )
                failed_provider = name
                logger.warning(
                    "market_data_provider_failed provider=%s capability=%s code=%s",
                    name,
                    capability,
                    last_error.code,
                )
                continue

            fallback = (
                name == "demo"
                or (requested != "auto" and name != requested)
                or failed_provider is not None
            )
            warnings = metadata.warnings
            if fallback:
                origin = failed_provider or requested
                warnings = (
                    *warnings,
                    f"Fallback ativo: {origin} → {name}.",
                )
            metadata = replace(
                metadata,
                fallback_used=fallback,
                warnings=warnings,
            )
            logger.info(
                "market_data_provider_selected provider=%s capability=%s fallback=%s",
                name,
                capability,
                fallback,
            )
            return (
                ProviderResolution(
                    provider=provider,
                    metadata=metadata,
                    requested_provider=requested,
                    fallback_used=fallback,
                ),
                result,
            )
        if last_error is not None:
            raise last_error
        raise ProviderNotConfiguredError(
            f"Provider com capacidade {capability}",
        )

    def statuses(self) -> list[ProviderMetadata]:
        return [
            provider.get_metadata(self.settings.symbol)
            for _, provider in sorted(self.registry.all().items())
        ]

    def manual_provider(self) -> ManualOptionsProvider:
        provider = self.registry.get("manual")
        if not isinstance(provider, ManualOptionsProvider):
            raise RuntimeError("Manual Options Provider não registrado.")
        return provider


_factory: MarketDataProviderFactory | None = None
_factory_lock = RLock()


def _build_factory() -> MarketDataProviderFactory:
    settings = MarketDataSettings.from_environment()
    cache = ProviderCache(settings.cache_seconds)
    registry = ProviderRegistry()
    registry.register(
        "alpha_vantage",
        AlphaVantageProvider(
            settings.alpha_vantage_api_key,
            cache=cache,
            timeout_seconds=settings.timeout_seconds,
        ),
    )
    registry.register("manual", ManualOptionsProvider())
    registry.register("csv", CsvProvider(settings.csv_path))
    registry.register("demo", DemoProvider())
    return MarketDataProviderFactory(settings, registry)


def get_provider_factory() -> MarketDataProviderFactory:
    global _factory
    with _factory_lock:
        if _factory is None:
            _factory = _build_factory()
        return _factory


def reset_provider_factory() -> None:
    global _factory
    with _factory_lock:
        _factory = None
