"""Strict manual option-chain import with no silent data fabrication."""

from __future__ import annotations

import csv
import io
import math
from datetime import UTC, date, datetime
from pathlib import Path
from threading import RLock
from typing import Any, BinaryIO, TextIO

from backend.providers.interface_provider import MarketDataProvider
from backend.providers.models import (
    FreshnessType,
    ImportIssue,
    ImportReport,
    ManualImportResult,
    NormalizedMarketData,
    NormalizedOptionChain,
    NormalizedOptionContract,
    NormalizedSpot,
    ProviderHealth,
    ProviderMetadata,
    ProviderState,
)

ALIASES = {
    "type": "option_type",
    "tipo": "option_type",
    "right": "option_type",
    "expiry": "expiration",
    "expiration_date": "expiration",
    "oi": "open_interest",
    "openinterest": "open_interest",
    "previous_oi": "previous_open_interest",
    "prior_open_interest": "previous_open_interest",
    "vol": "volume",
    "iv": "implied_volatility",
    "impliedvolatility": "implied_volatility",
    "previous_implied_volatility": "previous_iv",
    "spot": "underlying_price",
    "spot_price": "underlying_price",
    "underlying_spot": "underlying_price",
    "date_time": "timestamp",
}
REQUIRED_FIELDS = ("strike", "option_type", "open_interest", "volume")
OPTIONAL_FIELDS = (
    "symbol",
    "expiration",
    "bid",
    "ask",
    "last",
    "implied_volatility",
    "previous_open_interest",
    "previous_iv",
    "delta",
    "gamma",
    "theta",
    "vega",
    "underlying_price",
    "timestamp",
    "source",
    "aggressor",
    "days_to_expiry",
)


def _header(value: str) -> str:
    normalized = (
        value.strip().lower().replace(" ", "_").replace("-", "_")
    )
    return ALIASES.get(normalized, normalized)


def _decimal(value: Any, *, field: str, required: bool) -> float | None:
    text = "" if value is None else str(value).strip()
    if not text:
        if required:
            raise ValueError("valor obrigatório ausente")
        return None
    compact = text.replace("\u00a0", "").replace(" ", "")
    if "," in compact and "." in compact:
        if compact.rfind(",") > compact.rfind("."):
            compact = compact.replace(".", "").replace(",", ".")
        else:
            compact = compact.replace(",", "")
    elif "," in compact:
        compact = compact.replace(",", ".")
    try:
        number = float(compact)
    except ValueError as error:
        raise ValueError("valor numérico inválido") from error
    if not math.isfinite(number):
        raise ValueError("valor não finito")
    if field == "strike" and number <= 0:
        raise ValueError("strike deve ser positivo")
    if field == "days_to_expiry" and number <= 0:
        raise ValueError("days_to_expiry deve ser positivo")
    if field in {
        "bid",
        "ask",
        "last",
        "volume",
        "open_interest",
        "previous_open_interest",
        "gamma",
        "vega",
        "underlying_price",
    } and number < 0:
        raise ValueError(f"{field} não pode ser negativo")
    if field == "underlying_price" and number == 0:
        raise ValueError("underlying_price deve ser positivo")
    if field == "delta" and not -1 <= number <= 1:
        raise ValueError("delta deve estar entre -1 e 1")
    if field in {"implied_volatility", "previous_iv"}:
        number = number / 100 if number > 1 else number
        if not 0 < number <= 10:
            raise ValueError("implied_volatility fora do domínio válido")
    return number


def _expiration(value: Any) -> tuple[str | None, float | None]:
    text = "" if value is None else str(value).strip()
    if not text:
        return None, None
    try:
        parsed = date.fromisoformat(text)
    except ValueError as error:
        raise ValueError("expiration deve usar YYYY-MM-DD") from error
    days = (parsed - datetime.now(UTC).date()).days
    return parsed.isoformat(), float(days) if days > 0 else None


def _timestamp(value: Any) -> datetime | None:
    text = "" if value is None else str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("timestamp deve usar formato ISO 8601") from error
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)


def _option_type(value: Any) -> str:
    normalized = str(value or "").strip().upper()
    mapped = {
        "C": "CALL",
        "CALLS": "CALL",
        "P": "PUT",
        "PUTS": "PUT",
    }.get(normalized, normalized)
    if mapped not in {"CALL", "PUT"}:
        raise ValueError("option_type deve ser CALL ou PUT")
    return mapped


def _decode(source: BinaryIO | TextIO) -> str:
    if hasattr(source, "seek"):
        source.seek(0)
    content = source.read()
    if len(content) > 5_000_000:
        raise ValueError("O CSV excede o limite de 5 MB.")
    if isinstance(content, str):
        return content
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Codificação do CSV não suportada.")


class ManualOptionsProvider(MarketDataProvider):
    def __init__(self) -> None:
        self._chain: NormalizedOptionChain | None = None
        self._last_report: ImportReport | None = None
        self._lock = RLock()

    def validate(
        self,
        source: BinaryIO | TextIO,
        *,
        filename: str,
        symbol: str = "XAU",
    ) -> ManualImportResult:
        safe_filename = Path(filename or "options.csv").name
        text = _decode(source)
        first_line = text.splitlines()[0] if text.splitlines() else ""
        delimiter = ";" if first_line.count(";") > first_line.count(",") else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        if not reader.fieldnames:
            report = ImportReport(
                filename=safe_filename,
                total_rows=0,
                valid_rows=0,
                invalid_rows=0,
                can_import=False,
                issues=(ImportIssue(1, "header", "Cabeçalho CSV ausente."),),
            )
            self._last_report = report
            return ManualImportResult(report=report)

        normalized_headers = [_header(name) for name in reader.fieldnames]
        missing_required = [
            field for field in REQUIRED_FIELDS if field not in normalized_headers
        ]
        if missing_required:
            report = ImportReport(
                filename=safe_filename,
                total_rows=0,
                valid_rows=0,
                invalid_rows=0,
                can_import=False,
                issues=tuple(
                    ImportIssue(
                        1,
                        field,
                        f"Coluna obrigatória ausente: {field}.",
                    )
                    for field in missing_required
                ),
            )
            self._last_report = report
            return ManualImportResult(report=report)

        contracts: list[NormalizedOptionContract] = []
        issues: list[ImportIssue] = []
        total_rows = 0
        for row_number, raw in enumerate(reader, start=2):
            if not any(str(value or "").strip() for value in raw.values()):
                continue
            total_rows += 1
            row = {_header(key): value for key, value in raw.items() if key}
            try:
                expiration, days_to_expiry = _expiration(row.get("expiration"))
                provided_days = _decimal(
                    row.get("days_to_expiry"),
                    field="days_to_expiry",
                    required=False,
                )
                contract = NormalizedOptionContract(
                    symbol=(str(row.get("symbol") or symbol).strip().upper() or None),
                    expiration=expiration,
                    strike=_decimal(
                        row.get("strike"),
                        field="strike",
                        required=True,
                    )
                    or 0.0,
                    option_type=_option_type(row.get("option_type")),
                    bid=_decimal(row.get("bid"), field="bid", required=False),
                    ask=_decimal(row.get("ask"), field="ask", required=False),
                    last=_decimal(row.get("last"), field="last", required=False),
                    volume=_decimal(
                        row.get("volume"),
                        field="volume",
                        required=True,
                    )
                    or 0.0,
                    open_interest=_decimal(
                        row.get("open_interest"),
                        field="open_interest",
                        required=True,
                    )
                    or 0.0,
                    previous_open_interest=_decimal(
                        row.get("previous_open_interest"),
                        field="previous_open_interest",
                        required=False,
                    ),
                    implied_volatility=_decimal(
                        row.get("implied_volatility"),
                        field="implied_volatility",
                        required=False,
                    ),
                    previous_iv=_decimal(
                        row.get("previous_iv"),
                        field="previous_iv",
                        required=False,
                    ),
                    delta=_decimal(
                        row.get("delta"),
                        field="delta",
                        required=False,
                    ),
                    gamma=_decimal(
                        row.get("gamma"),
                        field="gamma",
                        required=False,
                    ),
                    theta=_decimal(
                        row.get("theta"),
                        field="theta",
                        required=False,
                    ),
                    vega=_decimal(
                        row.get("vega"),
                        field="vega",
                        required=False,
                    ),
                    underlying_price=_decimal(
                        row.get("underlying_price"),
                        field="underlying_price",
                        required=False,
                    ),
                    timestamp=_timestamp(row.get("timestamp")),
                    source=str(row.get("source") or safe_filename).strip(),
                    aggressor=_decimal(
                        row.get("aggressor"),
                        field="aggressor",
                        required=False,
                    ),
                    days_to_expiry=days_to_expiry or provided_days,
                )
                contracts.append(contract)
            except ValueError as error:
                issues.append(
                    ImportIssue(
                        row=row_number,
                        field="row",
                        message=str(error),
                    )
                )

        option_types = {contract.option_type for contract in contracts}
        if contracts and option_types != {"CALL", "PUT"}:
            issues.append(
                ImportIssue(
                    row=0,
                    field="option_type",
                    message="A cadeia deve conter ao menos uma CALL e uma PUT.",
                )
            )

        missing_optional = tuple(
            field
            for field in OPTIONAL_FIELDS
            if field not in normalized_headers
            or all(
                getattr(contract, field, None) is None
                for contract in contracts
            )
        )
        now = datetime.now(UTC)
        market_timestamps = [
            contract.timestamp
            for contract in contracts
            if contract.timestamp is not None
        ]
        market_timestamp = max(market_timestamps, default=None)
        delay_minutes = (
            max(0, int((now - market_timestamp).total_seconds() // 60))
            if market_timestamp
            else None
        )
        warnings = (
            ("Campos opcionais ausentes: " + ", ".join(missing_optional),)
            if missing_optional
            else ()
        )
        metadata = ProviderMetadata(
            provider="manual",
            source=safe_filename,
            symbol=symbol.upper(),
            retrieved_at=now,
            market_timestamp=market_timestamp,
            delay_minutes=delay_minutes,
            freshness_type=FreshnessType.MANUAL,
            is_demo=False,
            is_manual=True,
            is_partial=bool(missing_optional),
            warnings=warnings,
            missing_fields=missing_optional,
            status=ProviderState.READY if contracts and not issues else ProviderState.ERROR,
            last_success=now if contracts and not issues else None,
            last_error=issues[0].message if issues else None,
            capabilities=(
                "options",
                "manual_import",
                *(
                    ("spot",)
                    if any(
                        contract.underlying_price is not None
                        for contract in contracts
                    )
                    else ()
                ),
            ),
        )
        chain = (
            NormalizedOptionChain(tuple(contracts), metadata)
            if contracts and not issues
            else None
        )
        preview = tuple(
            {
                key: (
                    value.isoformat()
                    if isinstance(value, datetime)
                    else value
                )
                for key, value in contract.__dict__.items()
            }
            for contract in contracts[:20]
        )
        report = ImportReport(
            filename=safe_filename,
            total_rows=total_rows,
            valid_rows=len(contracts),
            invalid_rows=len(issues),
            can_import=chain is not None,
            issues=tuple(issues),
            warnings=warnings,
            missing_fields=missing_optional,
            preview=preview,
        )
        self._last_report = report
        return ManualImportResult(report=report, chain=chain)

    def confirm(self, result: ManualImportResult) -> NormalizedOptionChain:
        if not result.report.can_import or result.chain is None:
            raise ValueError("O arquivo possui erros e não pode ser importado.")
        with self._lock:
            self._chain = result.chain
        return result.chain

    def get_metadata(self, symbol: str = "XAU") -> ProviderMetadata:
        with self._lock:
            if self._chain:
                return self._chain.metadata
        now = datetime.now(UTC)
        return ProviderMetadata(
            provider="manual",
            source="upload autorizado pelo usuário",
            symbol=symbol,
            retrieved_at=now,
            market_timestamp=None,
            delay_minutes=None,
            freshness_type=FreshnessType.UNAVAILABLE,
            is_demo=False,
            is_manual=True,
            is_partial=True,
            warnings=("Nenhuma cadeia manual confirmada nesta execução.",),
            missing_fields=("option_chain",),
            status=ProviderState.UNAVAILABLE,
            capabilities=("options", "manual_import"),
        )

    def is_available(self) -> bool:
        with self._lock:
            return self._chain is not None

    def get_spot(self, symbol: str = "XAU") -> NormalizedSpot | None:
        with self._lock:
            chain = self._chain
        if not chain:
            return None
        prices = [
            contract.underlying_price
            for contract in chain.contracts
            if contract.underlying_price is not None
        ]
        if not prices:
            return None
        return NormalizedSpot(
            symbol=symbol,
            price=prices[0],
            currency="USD",
            unit=None,
            metadata=chain.metadata,
        )

    def get_market_snapshot(self, symbol: str = "XAU") -> NormalizedMarketData:
        chain = self.get_option_chain(symbol)
        metadata = chain.metadata if chain else self.get_metadata(symbol)
        return NormalizedMarketData(
            metadata=metadata,
            spot=self.get_spot(symbol),
            option_chain=chain,
        )

    def get_option_chain(
        self,
        symbol: str = "XAU",
    ) -> NormalizedOptionChain | None:
        with self._lock:
            return self._chain

    def get_health(self) -> ProviderHealth:
        available = self.is_available()
        return ProviderHealth(
            provider="manual",
            available=available,
            status=ProviderState.READY if available else ProviderState.UNAVAILABLE,
            message=(
                "Cadeia manual disponível."
                if available
                else "Nenhuma cadeia manual confirmada."
            ),
            checked_at=datetime.now(UTC),
        )
