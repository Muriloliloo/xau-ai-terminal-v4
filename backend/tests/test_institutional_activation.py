from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from backend.database import connection
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
            option_type=side,
            settlement=20,
            volume=10,
            open_interest=100 if side == "CALL" else 50,
            open_interest_change=5,
            delta=0.5,
            market_date=date(2026, 7, 24),
            source="CME Group Daily Information Bulletin — Section 64",
            source_page=2,
            source_line=index,
            raw_text=f"{strike} fixture",
        )
        for index, (side, strike) in enumerate(
            (("CALL", 4000), ("PUT", 3900)), start=1
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


class _Parser:
    def parse(self, _content: bytes) -> ParsedCmeBulletin:
        return _parsed()


def _client(monkeypatch, tmp_path) -> TestClient:
    database = tmp_path / "institutional.db"
    monkeypatch.setattr(connection, "DATABASE_PATH", database)
    service = CmeBulletinService(database_path=database)
    service.parser = _Parser()  # type: ignore[assignment]
    monkeypatch.setattr(service_module, "_service", service)
    return TestClient(app)


def test_confirmed_cme_is_active_and_excludes_gamma(monkeypatch, tmp_path) -> None:
    with _client(monkeypatch, tmp_path) as client:
        preview = client.post(
            "/api/market/cme-bulletin/preview",
            files={"file": ("fixture.pdf", b"%PDF-stub", "application/pdf")},
        ).json()
        confirmed = client.post(
            "/api/market/cme-bulletin/confirm",
            json={"preview_id": preview["preview_id"]},
        )
        state = client.get("/api/market/institutional/status").json()
        latest = client.get("/api/market/institutional/latest").json()

    assert confirmed.status_code == 200
    assert state["data_mode"] == "real_eod"
    assert state["provider"] == "cme_bulletin"
    assert state["fallback_active"] is False
    assert latest["open_interest"]["total_oi"] == 150
    assert latest["open_interest"]["put_call_oi_ratio"] == 0.5
    assert "gamma" in state["unavailable_metrics"]


def test_cme_snapshot_is_separate_and_demo_mode_is_explicit(monkeypatch, tmp_path) -> None:
    with _client(monkeypatch, tmp_path) as client:
        preview = client.post(
            "/api/market/cme-bulletin/preview",
            files={"file": ("fixture.pdf", b"%PDF-stub", "application/pdf")},
        ).json()
        client.post(
            "/api/market/cme-bulletin/confirm",
            json={"preview_id": preview["preview_id"]},
        )
        snapshot = client.post("/api/market/institutional/snapshots")
        listed = client.get("/api/market/institutional/snapshots")
        legacy = client.get("/api/snapshots")
        demo = client.post(
            "/api/market/institutional/mode", json={"mode": "demo"}
        ).json()

    assert snapshot.status_code == 201
    assert snapshot.json()["provider"] == "cme_bulletin"
    assert snapshot.json()["open_interest_total"] == 150
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert legacy.json() == []
    assert demo["state"]["data_mode"] == "demo"
    assert demo["state"]["fallback_active"] is False
