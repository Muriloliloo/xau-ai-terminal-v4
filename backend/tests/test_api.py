import importlib.util

import pytest

if importlib.util.find_spec("fastapi") is None:
    pytest.skip(
        "FastAPI não está instalado nesta venv; endpoints exigem requirements-dev.",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient  # noqa: E402

from backend.api import analysis  # noqa: E402
from backend.database import connection  # noqa: E402
from backend.main import app  # noqa: E402


def _client(monkeypatch, tmp_path) -> TestClient:
    monkeypatch.setattr(
        connection,
        "DATABASE_PATH",
        tmp_path / "api-test.db",
    )
    return TestClient(app)


def test_health_endpoint(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "name": "XAU AI TERMINAL V3",
        "version": "3.0 Alpha",
    }


def test_demo_analysis_preserves_results(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.post("/api/analysis/demo")

    assert response.status_code == 200
    payload = response.json()
    assert payload["call_wall"] == 4100.0
    assert payload["put_wall"] == 4000.0
    assert payload["gamma_flip"] == 4050.0
    assert payload["gamma_magnet"] == 4100.0
    assert payload["gex_total"] == 484.4
    assert payload["regime"] == "LONG GAMMA"
    assert len(payload["gex_by_strike"]) == 8
    assert payload["open_interest_summary"]["call_oi_total"] == 35585.0
    assert payload["open_interest_summary"]["put_oi_total"] == 32698.0
    assert payload["open_interest_analysis"]["total_oi"] == 68283.0
    assert payload["open_interest_analysis"]["largest_concentration_strike"] == 4100.0
    assert payload["open_interest_analysis"]["oi_concentration_score"] == 13.8194
    assert len(payload["open_interest_analysis"]["top_10_strikes"]) == 8
    assert (
        payload["dealer_report"]["open_interest_context"]["concentration_score"]
        == 13.8194
    )
    assert payload["gamma_summary"]["net_gex_total"] == 484.4
    assert payload["gamma_summary"]["regime_strength"] == "LONG GAMMA"
    assert payload["gamma_exposure_analysis"]["net_gex"] == pytest.approx(484.4013)
    assert payload["gamma_exposure_analysis"]["total_gex"] == pytest.approx(
        12180.8219
    )
    assert payload["gamma_exposure_analysis"]["dealer_pressure"] == "BALANCED"
    assert len(payload["gamma_exposure_analysis"]["curve_by_strike"]) == 8
    assert (
        payload["dealer_report"]["gamma_exposure_context"]["dealer_pressure"]
        == "BALANCED"
    )
    assert payload["volatility_analysis"]["volatility_summary"][
        "weighted_iv"
    ] == pytest.approx(19.891566)
    assert payload["volatility_analysis"]["volatility_summary"][
        "skew_classification"
    ] == "Equilibrado"
    assert payload["volatility_analysis"]["expected_move"]["available"] is False
    assert (
        payload["volatility_analysis"]["expected_move"]["reason"]
        == "Indisponível sem preço spot"
    )
    assert len(payload["volatility_analysis"]["volatility_curve"]) == 8
    assert 0 <= payload["dealer_report"]["institutional_score"] <= 100
    assert payload["dealer_report"]["decision_factors"]
    assert len(payload["strike_table"]) == 8
    assert payload["strike_table"][0]["call_oi_change"] == 127.0
    assert payload["snapshot_id"] is not None
    assert payload["snapshot_saved_automatically"] is True


def test_csv_upload_uses_same_analysis(monkeypatch, tmp_path):
    csv_data = (
        b"strike,type,open_interest,volume,iv,days_to_expiry\n"
        b"4000,CALL,10,5,0.20,28\n"
        b"4000,PUT,12,6,0.20,28\n"
    )
    with _client(monkeypatch, tmp_path) as client:
        response = client.post(
            "/api/analysis/upload",
            files={"file": ("options.csv", csv_data, "text/csv")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["gex_by_strike"][0]["strike"] == 4000.0
    assert payload["open_interest_summary"]["has_previous_open_interest"] is False
    assert payload["strike_table"][0]["call_oi_change"] == 0.0
    assert payload["volatility_analysis"]["volatility_summary"]["weighted_iv"] == 20


def test_invalid_upload_returns_validation_error(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.post(
            "/api/analysis/upload",
            files={"file": ("invalid.csv", b"strike,type\n4000,CALL\n", "text/csv")},
        )

    assert response.status_code == 422
    assert "Colunas obrigatórias ausentes" in response.json()["detail"]


def test_missing_demo_csv_does_not_expose_server_path(monkeypatch, tmp_path):
    missing_path = tmp_path / "private" / "missing-sample.csv"
    monkeypatch.setattr(analysis, "SAMPLE_CSV_PATH", missing_path)

    with _client(monkeypatch, tmp_path) as client:
        response = client.post("/api/analysis/demo")

    detail = response.json()["detail"]
    assert response.status_code == 404
    assert detail == "Arquivo CSV demonstrativo não encontrado."
    assert str(tmp_path) not in detail


def test_history_and_settings_endpoints(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        history_response = client.get("/api/history")
        settings_response = client.get("/api/settings")

    assert history_response.status_code == 200
    assert history_response.json() == []
    assert settings_response.status_code == 200
    assert settings_response.json()["realtime_data_enabled"] is False


def test_local_frontend_cors(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_snapshot_lifecycle_and_ordering(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        analysis_response = client.post("/api/analysis/demo")
        analysis = analysis_response.json()
        automatic_id = analysis["snapshot_id"]

        automatic_list = client.get("/api/snapshots")
        manual_response = client.post(
            "/api/snapshots/create",
            json={"analysis": analysis, "label": "Fechamento"},
        )
        manual = manual_response.json()
        ordered_list = client.get("/api/snapshots").json()
        detail = client.get(f"/api/snapshots/{manual['id']}")
        deleted = client.delete(f"/api/snapshots/{manual['id']}")
        missing = client.get(f"/api/snapshots/{manual['id']}")

    assert analysis_response.status_code == 200
    assert automatic_list.status_code == 200
    assert automatic_list.json()[0]["id"] == automatic_id
    assert automatic_list.json()[0]["is_automatic"] is True
    assert manual_response.status_code == 201
    assert manual["is_automatic"] is False
    assert manual["label"] == "Fechamento"
    assert [record["id"] for record in ordered_list] == [manual["id"], automatic_id]
    assert detail.status_code == 200
    assert detail.json()["analysis"]["gex_total"] == 484.4
    assert detail.json()["analysis"]["strike_table"]
    assert detail.json()["analysis"]["gamma_exposure_analysis"]["curve_by_strike"]
    assert detail.json()["analysis"]["volatility_analysis"]["volatility_curve"]
    assert (
        detail.json()["analysis"]["open_interest_analysis"][
            "oi_concentration_score"
        ]
        == 13.8194
    )
    assert deleted.status_code == 204
    assert missing.status_code == 404


def test_open_interest_endpoint(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.get("/api/open-interest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_name"] == "sample_options.csv"
    assert payload["call_oi_total"] == 35585.0
    assert payload["put_oi_total"] == 32698.0
    assert payload["net_oi"] == 2887.0
    assert payload["largest_concentration_strike"] == 4100.0
    assert payload["largest_concentration_pct"] == pytest.approx(19.0384)
    assert payload["oi_concentration_score"] == 13.8194
    assert len(payload["distribution_by_strike"]) == 8


def test_gamma_exposure_endpoint(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        response = client.get("/api/gex")

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_name"] == "sample_options.csv"
    assert payload["call_gex"] == pytest.approx(6332.6116)
    assert payload["put_gex"] == pytest.approx(-5848.2103)
    assert payload["net_gex"] == pytest.approx(484.4013)
    assert payload["total_gex"] == pytest.approx(12180.8219)
    assert payload["largest_positive_gex_strike"] == 4100
    assert payload["largest_negative_gex_strike"] == 4000
    assert payload["gamma_flip"] == 4050
    assert payload["gamma_magnet"] == 4100
    assert payload["gamma_source"] == "estimated"
    assert payload["spot_adjusted"] is False
    assert len(payload["curve_by_strike"]) == 8


def test_volatility_endpoint_does_not_create_snapshot(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        before = client.get("/api/snapshots").json()
        response = client.get("/api/volatility")
        after = client.get("/api/snapshots").json()

    assert response.status_code == 200
    payload = response.json()
    assert payload["source_name"] == "sample_options.csv"
    assert payload["volatility_summary"]["weighted_iv"] == pytest.approx(
        19.891566
    )
    assert payload["volatility_summary"]["call_iv"] == pytest.approx(19.9875)
    assert payload["volatility_summary"]["put_iv"] == pytest.approx(19.9875)
    assert payload["volatility_summary"]["iv_skew"] == 0
    assert payload["volatility_summary"]["skew_classification"] == "Equilibrado"
    assert payload["volatility_summary"]["highest_iv_strike"] == 4150
    assert payload["volatility_summary"]["lowest_iv_strike"] == 4050
    assert payload["expected_move"]["available"] is False
    assert payload["expected_move"]["expected_move_points"] is None
    assert payload["iv_rank"] is None
    assert payload["iv_percentile"] is None
    assert len(payload["volatility_curve"]) == 8
    assert len(payload["expiry_curve"]) == 1
    assert before == after
