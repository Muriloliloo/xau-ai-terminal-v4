from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import pytest

from backend.schemas.cme_bulletin import CmeBulletinContract
from backend.services.cme_bulletin_parser import (
    CmeBulletinParseError,
    CmeBulletinParser,
    ParsedCmeBulletin,
)
from backend.services.cme_bulletin_service import (
    CmeBulletinService,
    CmeDuplicateImportError,
    CmePreviewNotFoundError,
)
from backend.services.cme_bulletin_validator import (
    CmeBulletinValidator,
    align_spot,
)

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PDF = ROOT / "docs" / "samples" / "CME_Metals_Options_2026-07-24.pdf"
FIXTURES = ROOT / "tests" / "fixtures" / "cme_bulletin"
EXPECTED_SHA256 = (
    "f5775301f1de62b5a322c19b4c9423f7f0fb3b26439a7382dd96a70ad22f4873"
)


def _contract(
    option_type: str = "CALL",
    *,
    strike: float = 4000,
    open_interest: float | None = 100,
    volume: float | None = 10,
    gamma: float | None = None,
    expiration: str | None = "2026-08-26",
) -> CmeBulletinContract:
    return CmeBulletinContract(
        product_code="OG",
        product_name="COMEX GOLD OPTIONS",
        expiration=expiration,
        contract_month="AUG26",
        strike=strike,
        option_type=option_type,
        settlement=20,
        volume=volume,
        open_outcry_volume=volume,
        globex_volume=None,
        pnt_volume=None,
        open_interest=open_interest,
        open_interest_change=2,
        delta=0.5,
        implied_volatility=None,
        gamma=gamma,
        underlying_price=None,
        market_date=date(2026, 7, 24),
        source="CME Group Daily Information Bulletin — Section 64",
        source_page=2,
        source_line=12,
        raw_text=f"{strike} test row",
    )


def _parsed(
    contracts: tuple[CmeBulletinContract, ...] | None = None,
) -> ParsedCmeBulletin:
    return ParsedCmeBulletin(
        pages_total=2,
        pages_processed=2,
        bulletin_date=date(2026, 7, 24),
        contracts=contracts
        if contracts is not None
        else (_contract(), _contract("PUT", strike=3900)),
        gold_pages=(1, 2),
        product_blocks=(("OG", "CALL"), ("OG", "PUT")),
        ignored_lines=0,
        failed_pages=(),
        expiration_labels=("AUG26",),
        unresolved_expiration_labels=(),
    )


class _StubParser:
    def __init__(self, parsed: ParsedCmeBulletin) -> None:
        self.parsed = parsed

    def parse(self, _content: bytes) -> ParsedCmeBulletin:
        return self.parsed


def test_real_pdf_structure_counts_and_hash() -> None:
    content = SAMPLE_PDF.read_bytes()
    assert hashlib.sha256(content).hexdigest() == EXPECTED_SHA256

    parsed = CmeBulletinParser(max_pages=100).parse(content)
    report = CmeBulletinValidator().validate(parsed)

    assert parsed.pages_total == 67
    assert parsed.pages_processed == 67
    assert len(parsed.contracts) == 4397
    assert report.calls_found == 2242
    assert report.puts_found == 2155
    assert report.valid_contracts == 4397
    assert report.partial_contracts == 3482
    assert report.missing_expiration == 26
    assert report.duplicates == 0
    assert report.status == "partial"
    assert set(report.product_codes) == {
        "OG CALL",
        "OG PUT",
        "OG1 CALL",
        "OG1 PUT",
        "OG2 CALL",
        "OG2 PUT",
        "OG4 CALL",
        "OG4 PUT",
        "OG5 CALL",
        "OG5 PUT",
    }
    assert any(contract.delta is not None for contract in parsed.contracts)
    assert all(contract.gamma is None for contract in parsed.contracts)
    assert all(contract.implied_volatility is None for contract in parsed.contracts)


def test_real_pdf_page_limit_is_enforced_before_engine_processing() -> None:
    """A configured page cap must reject the bulletin without partial data."""

    content = SAMPLE_PDF.read_bytes()
    with pytest.raises(CmeBulletinParseError, match="excede o limite"):
        CmeBulletinParser(max_pages=1).parse(content)


def test_processing_time_limit_is_enforced() -> None:
    content = SAMPLE_PDF.read_bytes()
    with pytest.raises(CmeBulletinParseError, match="tempo limite"):
        CmeBulletinParser(max_seconds=0).parse(content)


def test_parser_rejects_empty_or_non_text_pdf_without_contracts() -> None:
    """Corrupt/empty payloads produce a stable public parser error."""

    with pytest.raises(CmeBulletinParseError):
        CmeBulletinParser().parse(b"")


def test_golden_files_are_small_realistic_and_cover_call_put_breaks() -> None:
    calls = (FIXTURES / "gold_calls_page.txt").read_text(encoding="utf-8")
    puts = (FIXTURES / "gold_puts_page.txt").read_text(encoding="utf-8")
    page_break = (FIXTURES / "gold_page_break.txt").read_text(encoding="utf-8")
    malformed = (FIXTURES / "malformed_gold_block.txt").read_text(encoding="utf-8")
    no_gold = (FIXTURES / "no_gold_products.txt").read_text(encoding="utf-8")

    assert "OG CALL COMEX GOLD OPTIONS" in calls
    assert "OG PUT COMEX GOLD OPTIONS" in puts
    assert "APR27" in page_break and "AUG26" in page_break
    assert "INVALID-STRIKE" in malformed
    assert "GOLD" not in no_gold
    assert all(path.stat().st_size < 2_000 for path in FIXTURES.glob("*.txt"))


def test_validator_rejects_no_gold_and_single_sided_data() -> None:
    validator = CmeBulletinValidator()
    empty = validator.validate(_parsed(()))
    call_only = validator.validate(_parsed((_contract(),)))

    assert empty.status == "rejected"
    assert validator.eligibility(
        _parsed(()),
        empty,
        align_spot(date(2026, 7, 24), None),
    ).status == "blocked"
    assert call_only.status == "incompatible"
    assert "Nenhuma PUT" in " ".join(call_only.blocking_errors)


def test_validator_detects_invalid_and_duplicate_rows_without_coercion() -> None:
    invalid_strike = _contract().model_copy(update={"strike": -1})
    invalid_oi = _contract().model_copy(update={"open_interest": -2})
    invalid_volume = _contract().model_copy(update={"volume": -3})
    duplicate = _contract("PUT", strike=3900)
    report = CmeBulletinValidator().validate(
        _parsed(
            (
                invalid_strike,
                invalid_oi,
                invalid_volume,
                duplicate,
                duplicate.model_copy(),
            )
        )
    )

    assert report.invalid_strikes == 1
    assert report.invalid_open_interest == 1
    assert report.invalid_volume == 1
    assert report.duplicates == 2
    assert report.status == "incompatible"


def test_missing_fields_remain_null_and_gate_is_open_interest_only() -> None:
    parsed = _parsed(
        (
            _contract(volume=None, expiration=None),
            _contract("PUT", strike=3900, volume=None, expiration=None),
        )
    )
    validator = CmeBulletinValidator()
    report = validator.validate(parsed)
    eligibility = validator.eligibility(
        parsed,
        report,
        align_spot(parsed.bulletin_date, None),
    )

    assert parsed.contracts[0].volume is None
    assert parsed.contracts[0].expiration is None
    assert parsed.contracts[0].gamma is None
    assert eligibility.status == "open_interest_only"
    assert eligibility.engines_allowed == ["open_interest"]
    assert eligibility.contracts_with_gamma == 0


@pytest.mark.parametrize(
    ("timestamp", "expected"),
    [
        (None, "unavailable"),
        (datetime(2026, 7, 24, 20, tzinfo=UTC), "aligned"),
        (datetime(2026, 7, 25, 20, tzinfo=UTC), "acceptable_with_warning"),
        (datetime(2026, 7, 27, 20, tzinfo=UTC), "stale"),
        (datetime(2026, 7, 30, 20, tzinfo=UTC), "incompatible"),
    ],
)
def test_spot_alignment_is_explicit(
    timestamp: datetime | None,
    expected: str,
) -> None:
    assert align_spot(date(2026, 7, 24), timestamp).status == expected


def test_preview_limits_type_hash_sanitization_ttl_and_capacity(tmp_path) -> None:
    service = CmeBulletinService(
        database_path=tmp_path / "cme.db",
        max_file_bytes=32,
        preview_ttl_seconds=1,
        max_previews=1,
    )
    service.parser = _StubParser(_parsed())  # type: ignore[assignment]

    with pytest.raises(CmeBulletinParseError, match="não é um PDF"):
        service.preview(b"not a pdf", filename="wrong.txt")
    with pytest.raises(CmeBulletinParseError, match="tamanho"):
        service.preview(b"%PDF-" + b"x" * 40, filename="large.pdf")

    content = b"%PDF-stub"
    preview = service.preview(content, filename="../../CME diário?.pdf")
    assert preview.filename == "CME_di_rio_.pdf"
    assert preview.file_hash == hashlib.sha256(content).hexdigest()
    assert service.status().preview_count == 1
    entry = service.cache.get(preview.preview_id)
    entry.preview.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    with pytest.raises(CmePreviewNotFoundError):
        service.confirm(preview.preview_id)


def test_confirm_persists_only_oi_and_detects_duplicate(tmp_path) -> None:
    database = tmp_path / "cme.db"
    service = CmeBulletinService(database_path=database)
    service.parser = _StubParser(_parsed())  # type: ignore[assignment]
    content = b"%PDF-valid-stub"

    preview = service.preview(content, filename="bulletin.pdf")
    confirmed = service.confirm(preview.preview_id)
    result = confirmed.result

    assert result.metadata.provider == "cme_bulletin"
    assert result.metadata.freshness_type == "end_of_day"
    assert result.metadata.is_manual is True
    assert result.open_interest_analysis is not None
    assert result.open_interest_analysis.total_oi == 200
    assert result.snapshot_created is False
    assert result.eligibility.status == "open_interest_only"
    assert service.latest().result is not None
    assert service.provider.get_spot() is None
    assert service.provider.get_option_chain() is not None

    duplicate = service.preview(content, filename="again.pdf")
    assert duplicate.duplicate is True
    with pytest.raises(CmeDuplicateImportError):
        service.confirm(duplicate.preview_id)
    reprocessed = service.confirm(
        duplicate.preview_id,
        allow_reprocess=True,
    ).result
    assert reprocessed.reprocessed is True
    assert reprocessed.reprocessed_from_id == result.id


def test_corrupt_pdf_returns_stable_error() -> None:
    with pytest.raises(CmeBulletinParseError, match="corrompido"):
        CmeBulletinParser().parse(b"%PDF-corrupted")
