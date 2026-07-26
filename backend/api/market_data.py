"""Internal market-data endpoints with explicit provenance and freshness."""

from __future__ import annotations

import io
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, File, Query, UploadFile

from backend.api.analysis import _analyze
from backend.providers.interface_provider import MarketDataProvider
from backend.providers.models import (
    FreshnessType,
    NormalizedOptionChain,
    NormalizedSpot,
    ProviderMetadata,
    ProviderState,
)
from backend.providers.provider_errors import ProviderError
from backend.providers.provider_factory import (
    MarketDataProviderFactory,
    get_provider_factory,
)
from backend.schemas.market_data import (
    DataMetadataResponse,
    HistoricalPriceResponse,
    ImportReportResponse,
    ManualImportResponse,
    MarketHistoryResponse,
    MarketOptionsResponse,
    MarketSpotResponse,
    OptionContractResponse,
    ProvidersResponse,
    ProviderStatusResponse,
    SpotResponse,
)

router = APIRouter(tags=["market-data"])


def _metadata_response(metadata: ProviderMetadata) -> DataMetadataResponse:
    return DataMetadataResponse.model_validate(metadata.as_dict())


def _status_response(metadata: ProviderMetadata) -> ProviderStatusResponse:
    return ProviderStatusResponse.model_validate(metadata.as_dict())


def _unavailable_metadata(
    factory: MarketDataProviderFactory,
    *,
    source: str,
    message: str,
) -> DataMetadataResponse:
    return DataMetadataResponse(
        provider=factory.settings.provider,
        source=source,
        symbol=factory.settings.symbol,
        retrieved_at=datetime.now(UTC),
        market_timestamp=None,
        delay_minutes=None,
        freshness_type=FreshnessType.UNAVAILABLE,
        is_demo=False,
        is_manual=False,
        is_partial=True,
        warnings=[message],
        missing_fields=[source],
        status=ProviderState.UNAVAILABLE,
        fallback_used=False,
    )


def _providers_response() -> ProvidersResponse:
    factory = get_provider_factory()
    return ProvidersResponse(
        selected_provider=factory.settings.provider,
        fallback_enabled=factory.settings.allow_demo_fallback,
        providers=[
            _status_response(metadata) for metadata in factory.statuses()
        ],
    )


def _required_spot(
    provider: MarketDataProvider,
    symbol: str,
) -> NormalizedSpot:
    spot = provider.get_spot(symbol)
    if spot is None:
        raise ProviderError("Preço spot indisponível.", code="spot_unavailable")
    return spot


def _required_options(
    provider: MarketDataProvider,
    symbol: str,
) -> NormalizedOptionChain:
    chain = provider.get_option_chain(symbol)
    if chain is None:
        raise ProviderError(
            "Cadeia de opções indisponível.",
            code="options_unavailable",
        )
    return chain


def _history(
    provider: MarketDataProvider,
    symbol: str,
) -> Any:
    history_loader = getattr(provider, "get_history", None)
    if history_loader is None:
        raise ProviderError(
            "Histórico diário indisponível.",
            code="history_unavailable",
        )
    return history_loader(symbol)


def _actual_metadata(
    metadata: ProviderMetadata,
    resolution_metadata: ProviderMetadata,
) -> ProviderMetadata:
    additional_warnings = tuple(
        warning
        for warning in resolution_metadata.warnings
        if warning not in metadata.warnings
    )
    return replace(
        metadata,
        fallback_used=resolution_metadata.fallback_used,
        warnings=(*metadata.warnings, *additional_warnings),
    )


@router.get("/providers", response_model=ProvidersResponse)
def providers() -> ProvidersResponse:
    """Return the configured provider catalog without making network calls."""

    return _providers_response()


@router.get("/providers/status", response_model=ProvidersResponse)
def provider_status() -> ProvidersResponse:
    """Return safe configuration and capability status."""

    return _providers_response()


@router.get("/market/spot", response_model=MarketSpotResponse)
def market_spot() -> MarketSpotResponse:
    factory = get_provider_factory()
    try:
        resolution, spot = factory.execute(
            "spot",
            lambda provider: _required_spot(
                provider,
                factory.settings.symbol,
            ),
        )
        metadata = _actual_metadata(
            spot.metadata,
            resolution.metadata,
        )
        return MarketSpotResponse(
            data=SpotResponse(
                price=spot.price,
                currency=spot.currency,
                unit=spot.unit,
            ),
            metadata=_metadata_response(metadata),
        )
    except ProviderError as error:
        return MarketSpotResponse(
            data=None,
            metadata=_unavailable_metadata(
                factory,
                source="spot",
                message=str(error),
            ),
        )


@router.get("/market/history", response_model=MarketHistoryResponse)
def market_history() -> MarketHistoryResponse:
    factory = get_provider_factory()
    try:
        resolution, history_result = factory.execute(
            "daily_history",
            lambda provider: _history(provider, factory.settings.symbol),
        )
        metadata, prices = history_result
        metadata = _actual_metadata(
            metadata,
            resolution.metadata,
        )
        return MarketHistoryResponse(
            data=[
                HistoricalPriceResponse(date=row.date, close=row.close)
                for row in prices
            ],
            metadata=_metadata_response(metadata),
        )
    except ProviderError as error:
        return MarketHistoryResponse(
            data=[],
            metadata=_unavailable_metadata(
                factory,
                source="daily_history",
                message=str(error),
            ),
        )


def _option_response(chain: NormalizedOptionChain) -> list[OptionContractResponse]:
    return [
        OptionContractResponse.model_validate(contract.__dict__)
        for contract in chain.contracts
    ]


@router.get("/market/options", response_model=MarketOptionsResponse)
def market_options() -> MarketOptionsResponse:
    factory = get_provider_factory()
    try:
        resolution, chain = factory.execute(
            "options",
            lambda provider: _required_options(
                provider,
                factory.settings.symbol,
            ),
        )
        metadata = _actual_metadata(
            chain.metadata,
            resolution.metadata,
        )
        return MarketOptionsResponse(
            data=_option_response(chain),
            metadata=_metadata_response(metadata),
        )
    except (FileNotFoundError, ValueError, ProviderError) as error:
        return MarketOptionsResponse(
            data=[],
            metadata=_unavailable_metadata(
                factory,
                source="option_chain",
                message=str(error),
            ),
        )


@router.get("/market/metadata", response_model=DataMetadataResponse)
def market_metadata(
    capability: str = Query(
        default="options",
        pattern="^(options|spot|daily_history)$",
    ),
) -> DataMetadataResponse:
    factory = get_provider_factory()
    try:
        return _metadata_response(factory.resolve(capability).metadata)
    except ProviderError as error:
        return _unavailable_metadata(
            factory,
            source=capability,
            message=str(error),
        )


def _report_payload(report: Any) -> ImportReportResponse:
    return ImportReportResponse.model_validate(
        {
            **report.__dict__,
            "issues": [issue.__dict__ for issue in report.issues],
        }
    )


@router.post("/market/options/import", response_model=ManualImportResponse)
def import_options(
    file: Annotated[UploadFile, File(...)],
    confirm: bool = Query(default=False),
) -> ManualImportResponse:
    factory = get_provider_factory()
    filename = Path(file.filename or "options.csv").name
    try:
        result = factory.manual_provider().validate(
            file.file,
            filename=filename,
            symbol=factory.settings.symbol,
        )
    except ValueError as error:
        return ManualImportResponse(
            imported=False,
            report=ImportReportResponse(
                filename=filename,
                total_rows=0,
                valid_rows=0,
                invalid_rows=1,
                can_import=False,
                issues=[
                    {
                        "row": 0,
                        "field": "file",
                        "message": str(error),
                    }
                ],
                warnings=[],
                missing_fields=[],
                preview=[],
            ),
        )

    report = _report_payload(result.report)
    if not confirm or not result.report.can_import or result.chain is None:
        return ManualImportResponse(imported=False, report=report)

    metadata = _metadata_response(result.chain.metadata)
    csv_source = io.StringIO(
        result.chain.to_dataframe().to_csv(index=False)
    )
    analysis = _analyze(
        csv_source,
        source_name=filename,
        source_mode="upload",
        source_updated_at=result.chain.metadata.market_timestamp,
        data_metadata=metadata,
    )
    factory.manual_provider().confirm(result)
    return ManualImportResponse(
        imported=True,
        report=report,
        metadata=metadata,
        analysis=analysis,
    )
