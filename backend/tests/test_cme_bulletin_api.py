from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.cme_bulletin import CmeBulletinContract
from backend.services import cme_bulletin_service as service_module
from backend.services.cme_bulletin_parser import ParsedCmeBulletin
from backend.services.cme_bulletin_service import CmeBulletinService


def _parsed() -> ParsedCmeBulletin:
    contracts = tuple(
        CmeBulletinContract(
            product_code="OG",
            product_name="COMEX GOLD OPTIONS",
            expiration="2026-08-26",
            contract_month="AUG26",
            strike=strike,
            option_type=option_type,
            settlement=20,
            volume=10,
            open_interest=100,
            delta=0.5,
            market_date=date(2026, 7, 24),
            source="CME Group Daily Information Bulletin — Section 64",
            source_page=2,
            source_line=index,
            raw_text=f"{strike} fixture",
        )
        for index, (option_type, strike) in enumerate(
            (("CALL", 4000), ("PUT", 3900)),
            start=1,
        )
    )
    return ParsedCmeBulletin(
        pages_total=2,
        pages_processed=2,
        bulletin_date=date(2026, 7, 24),
        contracts=contracts,
        gold_pages=(1, 2),
        product_blocks=(("OG", "CALL"), ("OG", "PUT")),
        ignored_lines=0,
        failed_pages=(),
        expiration_labels=("AUG26",),
        unresolved_expiration_labels=(),
    )


class _StubParser:
    def parse(self, _content: bytes) -> ParsedCmeBulletin:
        return _parsed()


def _client(monkeypatch, tmp_path) -> TestClient:
    service = CmeBulletinService(database_path=tmp_path / "api-cme.db")
    service.parser = _StubParser()  # type: ignore[assignment]
    monkeypatch.setattr(service_module, "_service", service)
    return TestClient(app)


def test_cme_preview_confirm_status_latest_flow(monkeypatch, tmp_path) -> None:
    with _client(monkeypatch, tmp_path) as client:
        preview_response = client.post(
            "/api/market/cme-bulletin/preview",
            files={"file": ("../../daily?.pdf", b"%PDF-stub", "application/pdf")},
        )
        snapshots_before = client.get("/api/snapshots")
        preview = preview_response.json()
        confirmed_response = client.post(
            "/api/market/cme-bulletin/confirm",
            json={"preview_id": preview["preview_id"]},
        )
        status = client.get("/api/market/cme-bulletin/status")
        latest = client.get("/api/market/cme-bulletin/latest")
        snapshots_after = client.get("/api/snapshots")

    assert preview_response.status_code == 200
    assert preview["filename"] == "daily_.pdf"
    assert preview["metadata"]["freshness_type"] == "end_of_day"
    assert preview["eligibility"]["status"] == "open_interest_only"
    assert snapshots_before.json() == snapshots_after.json()
    assert confirmed_response.status_code == 200
    assert confirmed_response.json()["result"]["snapshot_created"] is False
    assert status.status_code == 200
    assert status.json()["available"] is True
    assert latest.status_code == 200
    assert latest.json()["result"]["contract_count"] == 2


def test_cme_api_rejects_wrong_type_and_invalid_pdf(monkeypatch, tmp_path) -> None:
    with _client(monkeypatch, tmp_path) as client:
        wrong_type = client.post(
            "/api/market/cme-bulletin/preview",
            files={"file": ("fake.pdf", b"%PDF-stub", "text/plain")},
        )
        invalid = client.post(
            "/api/market/cme-bulletin/preview",
            files={"file": ("fake.pdf", b"not-pdf", "application/pdf")},
        )
        unknown = client.post(
            "/api/market/cme-bulletin/confirm",
            json={"preview_id": "unknown-preview-id-123456789"},
        )

    assert wrong_type.status_code == 415
    assert invalid.status_code == 422
    assert "stack" not in invalid.text.lower()
    assert unknown.status_code == 404
