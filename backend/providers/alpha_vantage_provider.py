"""Optional documented Alpha Vantage gold provider."""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from datetime import UTC, date, datetime
from typing import Any

import httpx

from backend.providers.interface_provider import MarketDataProvider
from backend.providers.models import (
    FreshnessType,
    NormalizedHistoricalPrice,
    NormalizedMarketData,
    NormalizedOptionChain,
    NormalizedSpot,
    ProviderHealth,
    ProviderMetadata,
    ProviderState,
)
from backend.providers.provider_cache import ProviderCache
from backend.providers.provider_errors import (
    ProviderError,
    ProviderFeatureUnavailableError,
    ProviderNotConfiguredError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
)

RequestJson = Callable[[dict[str, str]], Mapping[str, Any]]


class AlphaVantageProvider(MarketDataProvider):
    API_URL = "https://www.alphavantage.co/query"
    USER_AGENT = "XAU-AI-Terminal/4.0 market-data-provider"
    FREE_LIMIT = "Plano gratuito padrão: até 25 consultas por dia."

    def __init__(
        self,
        api_key: str | None,
        *,
        cache: ProviderCache,
        timeout_seconds: int = 10,
        max_retries: int = 1,
        request_json: RequestJson | None = None,
    ) -> None:
        self.api_key = api_key.strip() if api_key else None
        self.cache = cache
        self.timeout_seconds = max(1, timeout_seconds)
        self.max_retries = max(0, min(max_retries, 2))
        self.request_json = request_json
        self._last_success: datetime | None = None
        self._last_error: str | None = None

    def _metadata(
        self,
        symbol: str,
        *,
        freshness: FreshnessType,
        retrieved_at: datetime | None = None,
        market_timestamp: datetime | None = None,
        delay_minutes: int | None = None,
        warnings: tuple[str, ...] = (),
        status: ProviderState = ProviderState.READY,
        missing_fields: tuple[str, ...] = (),
    ) -> ProviderMetadata:
        return ProviderMetadata(
            provider="alpha_vantage",
            source="Alpha Vantage · API oficial",
            symbol=symbol,
            retrieved_at=retrieved_at or datetime.now(UTC),
            market_timestamp=market_timestamp,
            delay_minutes=delay_minutes,
            freshness_type=freshness,
            is_demo=False,
            is_manual=False,
            is_partial=bool(missing_fields),
            warnings=warnings,
            missing_fields=missing_fields,
            status=status,
            api_key_configured=bool(self.api_key),
            last_success=self._last_success,
            last_error=self._last_error,
            known_limit=self.FREE_LIMIT,
            cache_ttl_seconds=self.cache.ttl_seconds,
            capabilities=("spot", "daily_history"),
        )

    def get_metadata(self, symbol: str = "XAU") -> ProviderMetadata:
        if not self.api_key:
            return self._metadata(
                symbol,
                freshness=FreshnessType.UNAVAILABLE,
                status=ProviderState.UNAVAILABLE,
                warnings=("ALPHA_VANTAGE_API_KEY não configurada.",),
                missing_fields=("spot", "daily_history", "option_chain"),
            )
        return self._metadata(
            symbol,
            freshness=FreshnessType.DELAYED,
            status=(
                ProviderState.ERROR
                if self._last_error
                else ProviderState.READY
            ),
            warnings=(
                "Atraso não garantido pelo plano; dados não são rotulados como tempo real.",
                "Cadeias de opções em tempo real são recurso premium.",
            ),
            missing_fields=("option_chain",),
        )

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _request(self, params: dict[str, str]) -> Mapping[str, Any]:
        if not self.api_key:
            raise ProviderNotConfiguredError("Alpha Vantage")
        request_params = {**params, "apikey": self.api_key}
        cache_key = (
            "alpha_vantage",
            tuple(sorted(params.items())),
        )
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        for attempt in range(self.max_retries + 1):
            try:
                if self.request_json is not None:
                    payload = self.request_json(request_params)
                else:
                    with httpx.Client(
                        timeout=self.timeout_seconds,
                        headers={"User-Agent": self.USER_AGENT},
                    ) as client:
                        response = client.get(self.API_URL, params=request_params)
                        if response.status_code == 429:
                            raise ProviderRateLimitError("Alpha Vantage")
                        response.raise_for_status()
                        payload = response.json()
                if not isinstance(payload, Mapping):
                    raise ProviderResponseError("Alpha Vantage")
                self._raise_for_payload_error(payload)
                self.cache.set(cache_key, payload)
                self._last_success = datetime.now(UTC)
                self._last_error = None
                return payload
            except ProviderRateLimitError:
                self._last_error = "Limite de consultas atingido."
                raise
            except ProviderError as error:
                self._last_error = str(error)
                raise
            except (httpx.TimeoutException, TimeoutError) as error:
                if attempt >= self.max_retries:
                    self._last_error = "Timeout."
                    raise ProviderTimeoutError("Alpha Vantage") from error
            except (httpx.TransportError, httpx.HTTPStatusError) as error:
                if attempt >= self.max_retries:
                    self._last_error = "Falha de transporte."
                    raise ProviderError(
                        "Alpha Vantage temporariamente indisponível.",
                        code="provider_transport_error",
                        retryable=True,
                    ) from error
            except (TypeError, ValueError) as error:
                self._last_error = "Resposta inválida."
                raise ProviderResponseError("Alpha Vantage") from error
        raise ProviderResponseError("Alpha Vantage")

    @staticmethod
    def _raise_for_payload_error(payload: Mapping[str, Any]) -> None:
        message = " ".join(
            str(payload.get(key, ""))
            for key in ("Note", "Information", "Error Message")
            if payload.get(key)
        ).lower()
        if not message:
            return
        if any(term in message for term in ("rate limit", "frequency", "25 requests")):
            raise ProviderRateLimitError("Alpha Vantage")
        if any(term in message for term in ("premium", "subscribe", "entitlement")):
            raise ProviderFeatureUnavailableError()
        raise ProviderResponseError("Alpha Vantage")

    @staticmethod
    def _number(payload: Mapping[str, Any], *keys: str) -> float | None:
        normalized_keys = {key.lower().replace(" ", "_") for key in keys}

        def walk(value: Any) -> float | None:
            if isinstance(value, Mapping):
                for key, nested in value.items():
                    normalized = str(key).lower().replace(" ", "_")
                    if normalized in normalized_keys:
                        try:
                            number = float(str(nested).replace(",", ""))
                        except (TypeError, ValueError):
                            continue
                        if math.isfinite(number):
                            return number
                for nested in value.values():
                    found = walk(nested)
                    if found is not None:
                        return found
            return None

        return walk(payload)

    @staticmethod
    def _text(payload: Mapping[str, Any], *keys: str) -> str | None:
        wanted = {key.lower().replace(" ", "_") for key in keys}

        def walk(value: Any) -> str | None:
            if not isinstance(value, Mapping):
                return None
            for key, nested in value.items():
                if (
                    str(key).lower().replace(" ", "_") in wanted
                    and nested
                ):
                    return str(nested)
            for nested in value.values():
                found = walk(nested)
                if found is not None:
                    return found
            return None

        return walk(payload)

    @staticmethod
    def _parse_timestamp(value: str | None) -> datetime | None:
        if not value:
            return None
        candidates = (
            value.replace("Z", "+00:00"),
            value.replace(" ", "T") + "+00:00",
        )
        for candidate in candidates:
            try:
                parsed = datetime.fromisoformat(candidate)
                return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)
            except ValueError:
                continue
        return None

    def get_spot(self, symbol: str = "XAU") -> NormalizedSpot:
        payload = self._request(
            {"function": "GOLD_SILVER_SPOT", "symbol": symbol},
        )
        price = self._number(
            payload,
            "price",
            "spot_price",
            "05. price",
            "value",
        )
        if price is None or price <= 0:
            raise ProviderResponseError("Alpha Vantage")
        retrieved_at = datetime.now(UTC)
        market_timestamp = self._parse_timestamp(
            self._text(payload, "timestamp", "last_refreshed", "date"),
        )
        delay = (
            max(
                0,
                int((retrieved_at - market_timestamp).total_seconds() // 60),
            )
            if market_timestamp
            else None
        )
        metadata = self._metadata(
            symbol,
            freshness=FreshnessType.DELAYED,
            retrieved_at=retrieved_at,
            market_timestamp=market_timestamp,
            delay_minutes=delay,
            warnings=(
                "O endpoint é documentado como spot, mas o plano configurado não comprova tempo real.",
            ),
            missing_fields=("option_chain",),
        )
        return NormalizedSpot(
            symbol=symbol,
            price=price,
            currency=self._text(payload, "currency") or "USD",
            unit=self._text(payload, "unit"),
            metadata=metadata,
        )

    def get_history(
        self,
        symbol: str = "XAU",
    ) -> tuple[ProviderMetadata, tuple[NormalizedHistoricalPrice, ...]]:
        payload = self._request(
            {
                "function": "GOLD_SILVER_HISTORY",
                "symbol": symbol,
                "interval": "daily",
            },
        )
        raw_data = payload.get("data")
        if not isinstance(raw_data, list):
            raise ProviderResponseError("Alpha Vantage")
        prices: list[NormalizedHistoricalPrice] = []
        for row in raw_data:
            if not isinstance(row, Mapping):
                continue
            row_date = str(row.get("date", ""))
            try:
                date.fromisoformat(row_date)
                close = float(str(row.get("value", "")).replace(",", ""))
            except (TypeError, ValueError):
                continue
            if math.isfinite(close) and close > 0:
                prices.append(NormalizedHistoricalPrice(row_date, close))
        if not prices:
            raise ProviderResponseError("Alpha Vantage")
        prices.sort(key=lambda row: row.date, reverse=True)
        retrieved_at = datetime.now(UTC)
        market_timestamp = datetime.fromisoformat(
            prices[0].date,
        ).replace(tzinfo=UTC)
        metadata = self._metadata(
            symbol,
            freshness=FreshnessType.HISTORICAL,
            retrieved_at=retrieved_at,
            market_timestamp=market_timestamp,
            delay_minutes=max(
                0,
                int((retrieved_at - market_timestamp).total_seconds() // 60),
            ),
            warnings=("Série diária histórica; não representa cotação em tempo real.",),
            missing_fields=("option_chain",),
        )
        return metadata, tuple(prices)

    def get_market_snapshot(self, symbol: str = "XAU") -> NormalizedMarketData:
        spot = self.get_spot(symbol)
        return NormalizedMarketData(metadata=spot.metadata, spot=spot)

    def get_option_chain(
        self,
        symbol: str = "XAU",
    ) -> NormalizedOptionChain | None:
        raise ProviderFeatureUnavailableError()

    def get_health(self) -> ProviderHealth:
        available = self.is_available()
        return ProviderHealth(
            provider="alpha_vantage",
            available=available,
            status=ProviderState.READY if available else ProviderState.UNAVAILABLE,
            message=(
                "Chave configurada; consulta externa ainda não executada."
                if available
                else "ALPHA_VANTAGE_API_KEY não configurada."
            ),
            checked_at=datetime.now(UTC),
        )
