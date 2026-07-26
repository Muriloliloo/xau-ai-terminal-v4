import io

import httpx
import pytest

from backend.config import MarketDataSettings
from backend.providers.alpha_vantage_provider import AlphaVantageProvider
from backend.providers.demo_provider import DemoProvider
from backend.providers.manual_options_provider import ManualOptionsProvider
from backend.providers.provider_cache import ProviderCache
from backend.providers.provider_errors import (
    ProviderError,
    ProviderFeatureUnavailableError,
    ProviderNotConfiguredError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
)
from backend.providers.provider_factory import MarketDataProviderFactory
from backend.providers.provider_registry import ProviderRegistry


def test_provider_cache_tracks_hits_misses_and_expiry():
    current = [10.0]
    cache = ProviderCache(5, clock=lambda: current[0])

    assert cache.get("spot") is None
    cache.set("spot", {"price": 1})
    assert cache.get("spot") == {"price": 1}
    current[0] = 16.0
    assert cache.get("spot") is None

    stats = cache.stats()
    assert stats.hits == 1
    assert stats.misses == 2
    assert stats.entries == 0


def test_alpha_vantage_without_key_is_explicitly_unavailable():
    provider = AlphaVantageProvider(None, cache=ProviderCache(60))

    metadata = provider.get_metadata()

    assert provider.is_available() is False
    assert metadata.freshness_type == "unavailable"
    assert metadata.api_key_configured is False
    with pytest.raises(ProviderNotConfiguredError):
        provider.get_spot()


def test_alpha_vantage_spot_is_normalized_and_cached():
    calls = []

    def request(params):
        calls.append(params)
        return {
            "price": "2412.30",
            "currency": "USD",
            "unit": "troy ounce",
            "timestamp": "2026-07-25T18:00:00Z",
        }

    provider = AlphaVantageProvider(
        "secret",
        cache=ProviderCache(60),
        request_json=request,
    )

    first = provider.get_spot()
    second = provider.get_spot()

    assert first.price == 2412.3
    assert first.currency == "USD"
    assert first.metadata.freshness_type == "delayed"
    assert second.price == first.price
    assert len(calls) == 1
    assert calls[0]["function"] == "GOLD_SILVER_SPOT"
    assert calls[0]["apikey"] == "secret"


@pytest.mark.parametrize(
    "payload,error_type",
    [
        ({"Note": "API rate limit reached"}, ProviderRateLimitError),
        ({"Information": "premium endpoint"}, ProviderFeatureUnavailableError),
        ({"Error Message": "Invalid API key"}, ProviderResponseError),
        ({"unexpected": "payload"}, ProviderResponseError),
    ],
)
def test_alpha_vantage_returns_stable_errors(payload, error_type):
    provider = AlphaVantageProvider(
        "secret",
        cache=ProviderCache(60),
        request_json=lambda _: payload,
    )

    with pytest.raises(error_type):
        provider.get_spot()


def test_alpha_vantage_timeout_retries_once():
    calls = 0

    def timeout(_):
        nonlocal calls
        calls += 1
        raise httpx.TimeoutException("sensitive transport detail")

    provider = AlphaVantageProvider(
        "secret",
        cache=ProviderCache(60),
        request_json=timeout,
        max_retries=1,
    )

    with pytest.raises(ProviderTimeoutError):
        provider.get_spot()
    assert calls == 2


def test_alpha_vantage_daily_history_is_historical():
    provider = AlphaVantageProvider(
        "secret",
        cache=ProviderCache(60),
        request_json=lambda _: {
            "data": [
                {"date": "2026-07-25", "value": "2410.5"},
                {"date": "2026-07-24", "value": "2401.2"},
            ]
        },
    )

    metadata, history = provider.get_history()

    assert metadata.freshness_type == "historical"
    assert [row.close for row in history] == [2410.5, 2401.2]
    with pytest.raises(ProviderFeatureUnavailableError):
        provider.get_option_chain()


def test_manual_provider_accepts_semicolon_and_decimal_comma():
    csv_data = io.BytesIO(
        b"strike;option_type;open_interest;volume;implied_volatility;gamma\n"
        b"2400,5;CALL;100;10;25;0,012\n"
        b"2400,5;PUT;120;12;0,30;0,014\n"
    )
    provider = ManualOptionsProvider()

    result = provider.validate(csv_data, filename="../../options.csv")

    assert result.report.can_import is True
    assert result.report.filename == "options.csv"
    assert result.chain is not None
    assert result.chain.contracts[0].strike == 2400.5
    assert result.chain.contracts[0].implied_volatility == 0.25
    assert result.chain.contracts[1].implied_volatility == 0.30
    assert provider.is_available() is False
    provider.confirm(result)
    assert provider.is_available() is True


@pytest.mark.parametrize(
    "csv_data,field",
    [
        (
            b"strike,option_type,volume\n2400,CALL,10\n2400,PUT,10\n",
            "open_interest",
        ),
        (
            b"strike,option_type,open_interest,volume\nx,CALL,1,1\n2400,PUT,1,1\n",
            "row",
        ),
        (
            b"strike,option_type,open_interest,volume\n2400,CALL,1,1\n",
            "option_type",
        ),
    ],
)
def test_manual_provider_rejects_incomplete_or_invalid_files(csv_data, field):
    result = ManualOptionsProvider().validate(
        io.BytesIO(csv_data),
        filename="options.csv",
    )

    assert result.report.can_import is False
    assert any(issue.field == field for issue in result.report.issues)


def test_manual_provider_reports_optional_fields_without_fabricating_them():
    provider = ManualOptionsProvider()
    result = provider.validate(
        io.BytesIO(
            b"strike,type,open_interest,volume\n"
            b"2400,CALL,10,3\n"
            b"2400,PUT,12,4\n"
        ),
        filename="minimal.csv",
    )

    assert result.report.can_import is True
    assert "gamma" in result.report.missing_fields
    assert "implied_volatility" in result.report.missing_fields
    assert result.chain is not None
    assert result.chain.contracts[0].gamma is None
    assert result.chain.contracts[0].implied_volatility is None


def test_factory_falls_back_to_demo_for_option_chain():
    registry = ProviderRegistry()
    registry.register("manual", ManualOptionsProvider())
    registry.register("demo", DemoProvider())
    settings = MarketDataSettings(
        provider="alpha_vantage",
        alpha_vantage_api_key=None,
        cache_seconds=60,
        timeout_seconds=10,
        allow_demo_fallback=True,
        csv_path=None,
        symbol="XAU",
    )
    factory = MarketDataProviderFactory(settings, registry)

    resolution = factory.resolve("options")

    assert resolution.metadata.provider == "demo"
    assert resolution.fallback_used is True
    assert resolution.metadata.fallback_used is True


def test_factory_sanitizes_local_provider_errors():
    class BrokenLocalProvider(DemoProvider):
        def get_option_chain(self, symbol="XAU"):
            raise FileNotFoundError(
                r"C:\Users\Trader\private\secret-options.csv"
            )

    registry = ProviderRegistry()
    registry.register("csv", BrokenLocalProvider())
    settings = MarketDataSettings(
        provider="csv",
        alpha_vantage_api_key=None,
        cache_seconds=60,
        timeout_seconds=10,
        allow_demo_fallback=False,
        csv_path=None,
        symbol="XAU",
    )
    factory = MarketDataProviderFactory(settings, registry)

    with pytest.raises(ProviderError) as captured:
        factory.execute(
            "options",
            lambda provider: provider.get_option_chain("XAU"),
        )

    assert "secret-options.csv" not in str(captured.value)
    assert "não pôde fornecer dados válidos" in str(captured.value)
