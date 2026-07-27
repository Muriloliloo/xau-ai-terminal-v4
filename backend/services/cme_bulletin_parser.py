"""Coordinate-aware parser for manually supplied CME Section 64 bulletins."""

from __future__ import annotations

import io
import logging
import re
import time
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime
from typing import BinaryIO

import pdfplumber
from pydantic import ValidationError

try:
    import pypdfium2 as pdfium
except (ImportError, OSError):  # pragma: no cover - dependency fallback
    pdfium = None

from backend.schemas.cme_bulletin import CmeBulletinContract

CME_SOURCE = "CME Group Daily Information Bulletin — Section 64"
logger = logging.getLogger(__name__)
# Product labels in the bulletin have changed slightly between editions
# (some include ``COMEX`` and some omit the descriptive suffix entirely).
# Keep the code/type as the canonical identity and accept only explicitly
# identified OG gold products; generic ``GOLD OPTIONS`` headers are filtered
# separately below.
GOLD_PRODUCT_CODES = frozenset({"OG", "OG1", "OG2", "OG4", "OG5"})
GOLD_PRODUCT_ALIASES: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"^(OG(?:1|2|4|5)?)\s+(CALL|PUT)(?:\s+((?:COMEX\s+)?GOLD OPTIONS))?$",
        re.IGNORECASE,
    ),
)
SUPPORTED_GOLD_PAGE_PATTERN = re.compile(
    r"^\s*OG(?:1|2|4|5)?\s+(?:CALL|PUT)\b",
    re.IGNORECASE | re.MULTILINE,
)
UNSUPPORTED_WEEKLY_GOLD_PAGE_PATTERN = re.compile(
    r"^\s*G(?:WW|WT|WR|MW)\b",
    re.IGNORECASE | re.MULTILINE,
)
MONTH_NUMBER = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}
MONTH_PATTERN = re.compile(r"^[A-Z]{3}\d{2}$")
NUMBER_PATTERN = re.compile(
    r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[A-Z])?$",
    re.IGNORECASE,
)
BULLETIN_DATE_PATTERN = re.compile(
    r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+"
    r"([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})"
)


@dataclass(frozen=True)
class _Row:
    number: int
    top: float
    words: tuple[dict[str, object], ...]

    @property
    def text(self) -> str:
        return " ".join(str(word["text"]) for word in self.words)


@dataclass(frozen=True)
class ParsedCmeBulletin:
    pages_total: int
    pages_processed: int
    bulletin_date: date | None
    contracts: tuple[CmeBulletinContract, ...]
    gold_pages: tuple[int, ...]
    product_blocks: tuple[tuple[str, str], ...]
    ignored_lines: int
    failed_pages: tuple[int, ...]
    expiration_labels: tuple[str, ...]
    unresolved_expiration_labels: tuple[str, ...]


class CmeBulletinParseError(ValueError):
    """Stable parser error that is safe to expose through the internal API."""


def _number(value: object) -> float | None:
    text = str(value).strip().replace(",", "")
    # CME uses parentheses for negatives in a few summary columns.  Preserve
    # the sign instead of coercing unknown/blank markers to zero.
    if len(text) > 2 and text.startswith("(") and text.endswith(")"):
        text = f"-{text[1:-1]}"
    # Price and OI cells can carry one-letter indicators (R/B/A/P/N).  They
    # are annotations from the bulletin legend, not part of the value.
    text = re.sub(r"[A-Za-z]$", "", text)
    return float(text) if NUMBER_PATTERN.fullmatch(text) else None


def _cluster_rows(words: list[dict[str, object]]) -> list[_Row]:
    """Group words by visual baseline without assuming exact column spacing."""

    ordered = sorted(
        words,
        key=lambda word: (float(word["top"]), float(word["x0"])),
    )
    clusters: list[tuple[float, list[dict[str, object]]]] = []
    for word in ordered:
        top = float(word["top"])
        if not clusters or abs(top - clusters[-1][0]) > 1.6:
            clusters.append((top, [word]))
            continue
        cluster_words = clusters[-1][1]
        cluster_words.append(word)
        average_top = sum(float(item["top"]) for item in cluster_words) / len(
            cluster_words
        )
        clusters[-1] = (average_top, cluster_words)

    return [
        _Row(
            number=index,
            top=top,
            words=tuple(
                sorted(items, key=lambda word: float(word["x0"]))
            ),
        )
        for index, (top, items) in enumerate(clusters, start=1)
    ]


def _is_generic_product_header(row: _Row) -> bool:
    first = row.words[0]
    text = row.text
    return bool(
        float(first["x0"]) < 35
        and _number(first["text"]) is None
        and re.search(r"\b(?:OPTION|OPTIONS|CALL|PUT)\b", text, re.IGNORECASE)
        and any(70 <= float(word["x0"]) < 200 for word in row.words)
    )


def _values_in(row: _Row, minimum: float, maximum: float) -> list[float]:
    return [
        value
        for word in row.words
        if minimum <= float(word["x0"]) < maximum
        and (value := _number(word["text"])) is not None
    ]


def _parse_bulletin_date(rows: list[_Row]) -> date | None:
    match = BULLETIN_DATE_PATTERN.search(" ".join(row.text for row in rows))
    if not match:
        return None
    return datetime.strptime(match.group(1), "%b %d, %Y").date()


def _expiration_map(
    first_page_rows: list[_Row],
) -> dict[tuple[str, str, str], str]:
    month_columns: dict[float, str] = {}
    for row in first_page_rows:
        candidates = {
            round(float(word["x0"]), 1): str(word["text"]).upper()
            for word in row.words
            if MONTH_PATTERN.fullmatch(str(word["text"]).upper())
        }
        if len(candidates) >= 10:
            month_columns = candidates
            break
    if not month_columns:
        return {}

    result: dict[tuple[str, str, str], str] = {}
    for row in first_page_rows:
        match = re.match(
            r"^(OG(?:1|2|4|5)?)\s+(CALL|PUT)",
            row.text,
            re.IGNORECASE,
        )
        if not match:
            continue
        product_code, option_type = (
            match.group(1).upper(),
            match.group(2).upper(),
        )
        for word in row.words:
            raw_date = str(word["text"])
            if not re.fullmatch(r"\d{2}/\d{2}", raw_date):
                continue
            column = min(
                month_columns,
                key=lambda coordinate: abs(
                    coordinate - float(word["x0"])
                ),
            )
            contract_month = month_columns[column]
            month, day = (int(part) for part in raw_date.split("/"))
            contract_year = 2000 + int(contract_month[-2:])
            contract_month_number = MONTH_NUMBER[contract_month[:3]]
            expiration_year = (
                contract_year - 1
                if month > contract_month_number
                else contract_year
            )
            result[(product_code, option_type, contract_month)] = (
                f"{expiration_year:04d}-{month:02d}-{day:02d}"
            )
    return result


def _gold_page_hints(
    source: BinaryIO | bytes,
) -> tuple[list[bool] | None, list[bool] | None, float]:
    """Read lightweight page text to skip unsupported pages before pdfminer."""
    if pdfium is None:
        return None, None, 0.0

    started_at = time.perf_counter()
    if isinstance(source, bytes):
        content = source
    else:
        position = source.tell()
        content = source.read()
        source.seek(position)

    document = None
    try:
        document = pdfium.PdfDocument(content)
        parse_hints: list[bool] = []
        gold_hints: list[bool] = []
        for index in range(len(document)):
            page = document[index]
            text_page = page.get_textpage()
            try:
                page_text = text_page.get_text_range()
                upper_page_text = page_text.upper()
                has_gold = "GOLD" in upper_page_text
                has_supported_block = (
                    SUPPORTED_GOLD_PAGE_PATTERN.search(page_text) is not None
                )
                has_known_unsupported_block = (
                    UNSUPPORTED_WEEKLY_GOLD_PAGE_PATTERN.search(page_text)
                    is not None
                )
                gold_hints.append(has_gold)
                # Page 1 carries the bulletin date and expiration map. Keep
                # it even when it has no option block. Other pages only need
                # pdfminer extraction when they contain a supported OG block;
                # known weekly GOLD products (GWW/GWT/GWR/GMW) are intentionally
                # outside the existing parser contract and produced no rows.
                # Unknown GOLD layouts remain on the conservative path.
                parse_hints.append(
                    index == 0
                    or has_supported_block
                    or (has_gold and not has_known_unsupported_block)
                )
            finally:
                text_page.close()
                page.close()
        return parse_hints, gold_hints, time.perf_counter() - started_at
    except Exception as error:
        logger.warning(
            "cme_parser_gold_scan_failed error_type=%s",
            type(error).__name__,
        )
        return None, None, time.perf_counter() - started_at
    finally:
        if document is not None:
            document.close()


def _parse_change(row: _Row) -> float | None:
    tail = [
        str(word["text"]).upper()
        for word in row.words
        if float(word["x0"]) >= 566
    ]
    if "UNCH" in tail:
        return 0.0
    for index, token in enumerate(tail):
        # Depending on the PDF edition the sign and magnitude are either
        # separate words (``+`` ``12``) or a single token (``+12``).
        if token[:1] in {"+", "-"} and len(token) > 1:
            value = _number(token)
            if value is not None:
                return value
        if token not in {"+", "-"} or index + 1 >= len(tail):
            continue
        value = _number(tail[index + 1])
        if value is not None:
            return value if token == "+" else -value
    return None


def _parse_contract(
    row: _Row,
    *,
    page_number: int,
    product_code: str,
    option_type: str,
    product_name: str,
    contract_month: str,
    expiration: str | None,
    bulletin_date: date | None,
) -> CmeBulletinContract | None:
    first = row.words[0]
    strike = _number(first["text"])
    if float(first["x0"]) >= 35 or strike is None:
        return None

    settlement_values = _values_in(row, 330, 366)
    delta_values = _values_in(row, 398, 428)
    open_outcry_values = _values_in(row, 452, 486)
    globex_values = _values_in(row, 486, 516)
    pnt_values = _values_in(row, 516, 546)
    open_interest_values = _values_in(row, 546, 566)
    volume_parts = (
        open_outcry_values[0] if open_outcry_values else None,
        globex_values[0] if globex_values else None,
        pnt_values[0] if pnt_values else None,
    )
    volume = (
        sum(value for value in volume_parts if value is not None)
        if any(value is not None for value in volume_parts)
        else None
    )

    values = {
        "product_code": product_code,
        "product_name": product_name,
        "expiration": expiration,
        "contract_month": contract_month,
        "strike": strike,
        "option_type": option_type,
        "settlement": settlement_values[0] if settlement_values else None,
        "volume": volume,
        "open_outcry_volume": volume_parts[0],
        "globex_volume": volume_parts[1],
        "pnt_volume": volume_parts[2],
        "open_interest": (
            open_interest_values[0] if open_interest_values else None
        ),
        "open_interest_change": _parse_change(row),
        "delta": delta_values[0] if delta_values else None,
        "implied_volatility": None,
        "gamma": None,
        "underlying_price": None,
        "market_date": bulletin_date,
        "source": CME_SOURCE,
        "source_page": page_number,
        "source_line": row.number,
        "raw_text": row.text,
    }
    try:
        return CmeBulletinContract(**values)
    except ValidationError:
        # Keep malformed numeric rows available to the validator so the
        # preview can report the exact page/line instead of failing with a
        # framework traceback. Such rows remain ineligible for confirmation.
        model_construct = getattr(CmeBulletinContract, "model_construct", None)
        if model_construct is None:  # pragma: no cover - Pydantic v1 fallback
            return CmeBulletinContract.construct(**values)
        return model_construct(**values)


class CmeBulletinParser:
    def __init__(
        self,
        *,
        max_pages: int = 100,
        max_seconds: float | None = 120.0,
    ) -> None:
        self.max_pages = max_pages
        self.max_seconds = max_seconds

    def parse(self, source: BinaryIO | bytes) -> ParsedCmeBulletin:
        started_at = time.monotonic()

        def ensure_within_time_limit() -> None:
            if (
                self.max_seconds is not None
                and time.monotonic() - started_at > self.max_seconds
            ):
                raise CmeBulletinParseError(
                    "O processamento do PDF excedeu o tempo limite configurado."
                )

        parse_page_hints, gold_page_hints, gold_scan_seconds = _gold_page_hints(
            source
        )
        logger.info(
            "cme_parser_gold_scan pages=%s parse_pages=%s elapsed_seconds=%.3f",
            len(gold_page_hints) if gold_page_hints is not None else 0,
            len(parse_page_hints) if parse_page_hints is not None else 0,
            gold_scan_seconds,
        )
        ensure_within_time_limit()

        if isinstance(source, bytes):
            stream: BinaryIO = io.BytesIO(source)
        else:
            source.seek(0)
            stream = source

        open_started_at = time.perf_counter()
        try:
            pdf = pdfplumber.open(stream)
        except Exception as error:
            raise CmeBulletinParseError(
                "O arquivo PDF está corrompido ou não pode ser lido."
            ) from error
        logger.info(
            "cme_parser_pdf_open elapsed_seconds=%.3f",
            time.perf_counter() - open_started_at,
        )

        try:
            pages_total = len(pdf.pages)
            if pages_total == 0:
                raise CmeBulletinParseError("O PDF não contém páginas.")
            if pages_total > self.max_pages:
                raise CmeBulletinParseError(
                    f"O PDF excede o limite de {self.max_pages} páginas."
                )

            failed_pages: list[int] = []
            first_page_rows: list[_Row] = []
            pages_processed = 0
            bulletin_date = _parse_bulletin_date(first_page_rows)
            expirations = _expiration_map(first_page_rows)
            contracts: list[CmeBulletinContract] = []
            gold_pages: set[int] = set()
            product_blocks: set[tuple[str, str]] = set()
            expiration_labels: set[str] = set()
            unresolved_labels: set[str] = set()
            ignored_lines = 0
            normalization_seconds = 0.0
            gold_detection_seconds = 0.0
            interpretation_seconds = 0.0
            current_product: tuple[str, str, str] | None = None
            current_month: str | None = None

            for page_number, page in enumerate(pdf.pages, start=1):
                ensure_within_time_limit()
                page_started_at = time.perf_counter()
                if (
                    parse_page_hints is not None
                    and page_number > 1
                    and page_number <= len(parse_page_hints)
                    and not parse_page_hints[page_number - 1]
                ):
                    pages_processed += 1
                    if (
                        gold_page_hints is not None
                        and page_number <= len(gold_page_hints)
                        and gold_page_hints[page_number - 1]
                    ):
                        gold_pages.add(page_number)
                    current_product = None
                    current_month = None
                    page.flush_cache()
                    page.close()
                    page_elapsed = time.perf_counter() - page_started_at
                    logger.info(
                        "cme_parser_page page=%s pages_total=%s page_seconds=%.3f "
                        "elapsed_seconds=%.3f contracts=%s skipped_fast_path=true",
                        page_number,
                        pages_total,
                        page_elapsed,
                        time.monotonic() - started_at,
                        len(contracts),
                    )
                    continue

                try:
                    words = page.extract_words(
                        x_tolerance=1,
                        y_tolerance=2,
                        keep_blank_chars=False,
                    )
                    rows = _cluster_rows(words)
                    del words
                except MemoryError as error:
                    raise CmeBulletinParseError(
                        "O processamento do PDF excedeu a memória disponível."
                    ) from error
                except Exception as error:
                    logger.warning(
                        "cme_parser_page_failed page=%s error_type=%s",
                        page_number,
                        type(error).__name__,
                    )
                    try:
                        page.flush_cache()
                        page.close()
                    except Exception:
                        pass
                    failed_pages.append(page_number)
                    continue

                pages_processed += 1
                if page_number == 1:
                    first_page_rows = rows
                    bulletin_date = _parse_bulletin_date(first_page_rows)
                    expirations = _expiration_map(first_page_rows)
                gold_detection_started_at = time.perf_counter()
                full_page_text = " ".join(row.text for row in rows)
                upper_page_text = full_page_text.upper()
                if "GOLD" in upper_page_text:
                    gold_pages.add(page_number)
                gold_detection_seconds += (
                    time.perf_counter() - gold_detection_started_at
                )
                interpretation_started_at = time.perf_counter()
                if "OPTIONS EOO'S AND BLOCKS" not in upper_page_text:
                    for row in rows:
                        matched_product = None
                        for pattern in GOLD_PRODUCT_ALIASES:
                            matched_product = pattern.fullmatch(row.text)
                            if matched_product:
                                break
                        if matched_product:
                            candidate = (
                                matched_product.group(1).upper(),
                                matched_product.group(2).upper(),
                                (
                                    matched_product.group(3)
                                    or "GOLD OPTIONS"
                                ).upper(),
                            )
                            if (
                                current_product is None
                                or candidate[:2] != current_product[:2]
                            ):
                                current_month = None
                            current_product = candidate
                            product_blocks.add(candidate[:2])
                            continue

                        if _is_generic_product_header(row):
                            if "GOLD" in row.text.upper():
                                ignored_lines += 1
                            current_product = None
                            current_month = None
                            continue

                        first = row.words[0]
                        first_text = str(first["text"]).upper()
                        if (
                            float(first["x0"]) < 40
                            and MONTH_PATTERN.fullmatch(first_text)
                        ):
                            current_month = first_text
                            continue

                        if (
                            current_product is None
                            or current_month is None
                            or not 125 <= row.top <= 925
                        ):
                            continue

                        expiration_labels.add(current_month)
                        expiration = expirations.get(
                            (
                                current_product[0],
                                current_product[1],
                                current_month,
                            )
                        )
                        if expiration is None:
                            unresolved_labels.add(current_month)
                        normalization_started_at = time.perf_counter()
                        contract = _parse_contract(
                            row,
                            page_number=page_number,
                            product_code=current_product[0],
                            option_type=current_product[1],
                            product_name=current_product[2],
                            contract_month=current_month,
                            expiration=expiration,
                            bulletin_date=bulletin_date,
                        )
                        normalization_seconds += (
                            time.perf_counter() - normalization_started_at
                        )
                        if contract is None:
                            if _number(first["text"]) is not None:
                                ignored_lines += 1
                            continue
                        contracts.append(contract)
                interpretation_seconds += (
                    time.perf_counter() - interpretation_started_at
                )
                # pdfplumber caches page characters/objects. Release those
                # caches immediately so the Render worker never accumulates
                # all 67 pages while iterating.
                page.flush_cache()
                page.close()
                del full_page_text, rows
                logger.info(
                    "cme_parser_page page=%s pages_total=%s page_seconds=%.3f "
                    "elapsed_seconds=%.3f contracts=%s skipped_fast_path=false",
                    page_number,
                    pages_total,
                    time.perf_counter() - page_started_at,
                    time.monotonic() - started_at,
                    len(contracts),
                )

            if pages_processed == 0:
                raise CmeBulletinParseError(
                    "Não foi possível extrair texto de nenhuma página."
                )

            logger.info(
                "cme_parser_timing gold_detection_seconds=%.3f "
                "interpretation_seconds=%.3f normalization_seconds=%.3f "
                "total_seconds=%.3f contracts=%s",
                gold_detection_seconds,
                interpretation_seconds,
                normalization_seconds,
                time.monotonic() - started_at,
                len(contracts),
            )
            return ParsedCmeBulletin(
                pages_total=pages_total,
                pages_processed=pages_processed,
                bulletin_date=bulletin_date,
                contracts=tuple(contracts),
                gold_pages=tuple(sorted(gold_pages)),
                product_blocks=tuple(sorted(product_blocks)),
                ignored_lines=ignored_lines,
                failed_pages=tuple(failed_pages),
                expiration_labels=tuple(sorted(expiration_labels)),
                unresolved_expiration_labels=tuple(
                    sorted(unresolved_labels)
                ),
            )
        finally:
            pdf.close()
            if isinstance(source, bytes):
                stream.close()

    @staticmethod
    def duplicate_count(
        contracts: tuple[CmeBulletinContract, ...],
    ) -> int:
        keys = Counter(
            (
                contract.product_code,
                contract.option_type,
                contract.contract_month,
                contract.strike,
            )
            for contract in contracts
        )
        return sum(count - 1 for count in keys.values() if count > 1)
