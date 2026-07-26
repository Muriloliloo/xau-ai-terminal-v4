import json
import sqlite3

from backend.core.alert_engine import build_alerts
from backend.core.commentary_engine import build_market_commentary
from backend.core.decision_engine import build_decision
from backend.core.market_engine import combine_market_and_institutional
from backend.database.connection import initialize_database
from backend.services.scheduler_service import scheduler_status
from backend.services.tradingview_exporter import export_levels

SUMMARY = {
    "Call Wall": 4100.0,
    "Put Wall": 4000.0,
    "Gamma Flip": 4050.0,
    "Gamma Magnet": 4100.0,
    "GEX Total": 484.4,
}
DEALER = {
    "regime": "LONG GAMMA",
    "dealer_bias": "REVERTER MOVIMENTOS",
    "volatility": "BAIXA / CONTROLADA",
    "confidence": 60.4844,
}


def test_preserved_rule_engines():
    assert build_alerts(SUMMARY, DEALER) == ["Nível de Gamma Flip: 4050.0"]
    assert build_decision(DEALER).startswith("Priorizar operações de reversão")
    assert "LONG GAMMA" in build_market_commentary(SUMMARY, DEALER)
    assert combine_market_and_institutional("LONG", "LONG GAMMA")["aligned"] is True


def test_preserved_scheduler_status():
    assert scheduler_status() == {
        "enabled": False,
        "message": "Agendador ainda não ativado.",
    }


def test_preserved_json_export(tmp_path):
    destination = export_levels({"gamma_flip": 4050.0}, tmp_path / "levels.json")

    assert destination.exists()
    assert json.loads(destination.read_text(encoding="utf-8")) == {"gamma_flip": 4050.0}


def test_database_initialization_preserves_schema(tmp_path):
    database_path = tmp_path / "xau_terminal.db"

    initialize_database(database_path)

    with sqlite3.connect(database_path) as connection:
        columns = connection.execute("PRAGMA table_info(institutional_levels)").fetchall()

    assert [column[1] for column in columns] == [
        "id",
        "created_at",
        "call_wall",
        "put_wall",
        "gamma_flip",
        "gamma_magnet",
        "gex_total",
        "regime",
        "dealer_bias",
        "confidence",
    ]
