import importlib.util

import pytest

if importlib.util.find_spec("fastapi") is None:
    pytest.skip(
        "FastAPI não está instalado nesta venv.",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient  # noqa: E402

from backend.database import connection  # noqa: E402
from backend.main import app  # noqa: E402
from backend.providers.provider_factory import reset_provider_factory  # noqa: E402


def _client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setattr(
        connection,
        "DATABASE_PATH",
        tmp_path / "market-api-test.db",
    )
    monkeypatch.delenv("ALPHA_VANTAGE_API_KEY", raising=False)
    monkeypatch.setenv("MARKET_DATA_PROVIDER", "auto")
    reset_provider_factory()
    return TestClient(app)


def test_provider_status_does_not_require_external_key(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.get("/api/providers/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["selected_provider"] == "auto"
    alpha = next(
        item
        for item in payload["providers"]
        if item["provider"] == "alpha_vantage"
    )
    assert alpha["api_key_configured"] is False
    assert alpha["status"] == "unavailable"
    assert "spot" in alpha["capabilities"]
    reset_provider_factory()


def test_market_endpoints_expose_freshness_and_safe_unavailable_state(
    monkeypatch,
    tmp_path,
):
    with _client(monkeypatch, tmp_path) as client:
        options = client.get("/api/market/options")
        spot = client.get("/api/market/spot")
        metadata = client.get("/api/market/metadata")

    assert options.status_code == 200
    assert options.json()["data"]
    assert options.json()["metadata"]["freshness_type"] == "demo"
    assert options.json()["metadata"]["fallback_used"] is True
    assert spot.status_code == 200
    assert spot.json()["data"] is None
    assert spot.json()["metadata"]["freshness_type"] == "unavailable"
    assert metadata.status_code == 200
    reset_provider_factory()


def test_manual_import_requires_preview_then_confirmation(monkeypatch, tmp_path):
    csv_data = (
        b"strike,option_type,open_interest,volume,implied_volatility,"
        b"underlying_price,expiration\n"
        b"2400,CALL,100,10,0.25,2412.30,2030-08-30\n"
        b"2400,PUT,120,12,0.30,2412.30,2030-08-30\n"
    )
    with _client(monkeypatch, tmp_path) as client:
        preview = client.post(
            "/api/market/options/import",
            files={"file": ("manual.csv", csv_data, "text/csv")},
        )
        before = client.get("/api/snapshots")
        confirmed = client.post(
            "/api/market/options/import?confirm=true",
            files={"file": ("manual.csv", csv_data, "text/csv")},
        )
        after = client.get("/api/snapshots")
        options = client.get("/api/market/options")

    assert preview.status_code == 200
    assert preview.json()["imported"] is False
    assert preview.json()["report"]["can_import"] is True
    assert before.json() == []
    assert confirmed.status_code == 200
    payload = confirmed.json()
    assert payload["imported"] is True
    assert payload["analysis"]["data_metadata"]["provider"] == "manual"
    assert payload["analysis"]["price"] == 2412.3
    assert payload["analysis"]["snapshot_id"] is not None
    assert len(after.json()) == 1
    assert after.json()[0]["data_metadata"]["provider"] == "manual"
    assert options.json()["metadata"]["provider"] == "manual"
    reset_provider_factory()


def test_invalid_manual_import_never_creates_snapshot(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.post(
            "/api/market/options/import?confirm=true",
            files={
                "file": (
                    "invalid.csv",
                    b"strike,option_type,volume\n2400,CALL,1\n",
                    "text/csv",
                )
            },
        )
        snapshots = client.get("/api/snapshots")

    assert response.status_code == 200
    assert response.json()["imported"] is False
    assert response.json()["report"]["can_import"] is False
    assert snapshots.json() == []
    reset_provider_factory()


def test_demo_analysis_and_snapshot_include_data_metadata(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        analysis = client.post("/api/analysis/demo").json()
        snapshots = client.get("/api/snapshots").json()
        detail = client.get(f"/api/snapshots/{analysis['snapshot_id']}").json()

    assert analysis["data_metadata"]["freshness_type"] == "demo"
    assert snapshots[0]["data_metadata"]["provider"] == "demo"
    assert detail["analysis"]["data_metadata"]["provider"] == "demo"
    reset_provider_factory()


def test_snapshot_without_provider_metadata_remains_compatible(
    monkeypatch,
    tmp_path,
):
    with _client(monkeypatch, tmp_path) as client:
        legacy_analysis = client.post("/api/analysis/demo").json()
        legacy_analysis.pop("data_metadata")
        created = client.post(
            "/api/snapshots/create",
            json={"analysis": legacy_analysis, "label": "Legado"},
        )
        listed = client.get("/api/snapshots").json()

    assert created.status_code == 201
    assert created.json()["data_metadata"] is None
    assert created.json()["analysis"]["data_metadata"] is None
    assert listed[0]["data_metadata"] is None
    reset_provider_factory()
