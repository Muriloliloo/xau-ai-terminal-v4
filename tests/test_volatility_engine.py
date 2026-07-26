import json
import math

import pandas as pd
import pytest

from backend.core.snapshot_engine import SnapshotEngine
from backend.core.volatility_engine import VolatilityEngine


def _options(rows):
    return pd.DataFrame(rows)


def _row(
    strike,
    option_type,
    iv,
    *,
    open_interest=100,
    previous_iv=None,
    expiry="2026-08-25",
    days_to_expiry=28,
    spot=None,
):
    return {
        "strike": strike,
        "type": option_type,
        "open_interest": open_interest,
        "volume": 0,
        "iv": iv,
        "previous_iv": previous_iv,
        "expiry": expiry,
        "days_to_expiry": days_to_expiry,
        "spot": spot,
    }


def test_decimal_iv_summary_and_skew():
    engine = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", 0.20, open_interest=100),
                _row(4000, "PUT", 0.30, open_interest=50),
            ]
        )
    )

    summary = engine.summary()

    assert summary["weighted_iv"] == pytest.approx(0.2333333333)
    assert summary["call_iv"] == 0.20
    assert summary["put_iv"] == 0.30
    assert summary["iv_skew"] == pytest.approx(0.10)
    assert summary["skew_classification"] == "Puts mais caras"


def test_percentage_iv_is_normalized_to_decimal():
    summary = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", 20),
                _row(4000, "PUT", 30),
            ]
        )
    ).summary()

    assert summary["call_iv"] == pytest.approx(0.20)
    assert summary["put_iv"] == pytest.approx(0.30)
    assert summary["maximum_iv"] == pytest.approx(0.30)


def test_missing_iv_returns_empty_analysis():
    frame = _options(
        [
            {
                "strike": 4000,
                "type": "CALL",
                "open_interest": 100,
                "volume": 0,
            }
        ]
    )
    engine = VolatilityEngine(frame)

    assert engine.summary()["has_iv"] is False
    assert engine.summary()["weighted_iv"] is None
    assert engine.curve().empty


def test_missing_previous_iv_does_not_invent_change():
    frame = _options([_row(4000, "CALL", 0.20)]).drop(
        columns=["previous_iv"]
    )
    summary = VolatilityEngine(frame).summary()

    assert summary["has_previous_iv"] is False
    assert summary["weighted_iv_change"] is None
    assert summary["largest_iv_increase_strike"] is None
    assert summary["largest_iv_decrease_strike"] is None


def test_calls_without_iv_keep_put_metrics_only():
    summary = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", None),
                _row(4000, "PUT", 0.30),
            ]
        )
    ).summary()

    assert summary["call_iv"] is None
    assert summary["put_iv"] == 0.30
    assert summary["iv_skew"] is None
    assert summary["skew_classification"] is None


def test_puts_without_iv_keep_call_metrics_only():
    summary = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", 0.20),
                _row(4000, "PUT", None),
            ]
        )
    ).summary()

    assert summary["call_iv"] == 0.20
    assert summary["put_iv"] is None
    assert summary["iv_skew"] is None
    assert summary["skew_classification"] is None


def test_multiple_expiries_produce_separate_curves():
    engine = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", 0.20, expiry="2026-08-25"),
                _row(4000, "PUT", 0.21, expiry="2026-08-25"),
                _row(4000, "CALL", 0.25, expiry="2026-09-25"),
                _row(4000, "PUT", 0.26, expiry="2026-09-25"),
            ]
        )
    )

    assert len(engine.curve()) == 2
    assert len(engine.by_expiry()) == 2
    assert set(engine.curve()["expiry"]) == {"2026-08-25", "2026-09-25"}


def test_expected_move_with_spot_iv_and_days():
    expected = VolatilityEngine(
        _options(
            [
                _row(
                    4000,
                    "CALL",
                    0.25,
                    days_to_expiry=36.5,
                    spot=4000,
                )
            ]
        )
    ).expected_move()
    move = 4000 * 0.25 * math.sqrt(36.5 / 365)

    assert expected["available"] is True
    assert expected["expected_move_points"] == pytest.approx(move)
    assert expected["expected_move_pct"] == pytest.approx(
        0.25 * math.sqrt(36.5 / 365) * 100
    )
    assert expected["upper_level"] == pytest.approx(4000 + move)
    assert expected["lower_level"] == pytest.approx(4000 - move)
    assert expected["expiry"] == "2026-08-25"


def test_expected_move_without_spot_is_explicitly_unavailable():
    expected = VolatilityEngine(
        _options([_row(4000, "CALL", 0.25)])
    ).expected_move()

    assert expected == {
        "available": False,
        "reason": "Indisponível sem preço spot",
        "expected_move_points": None,
        "expected_move_pct": None,
        "upper_level": None,
        "lower_level": None,
        "expiry": None,
    }


def test_invalid_iv_values_are_excluded():
    engine = VolatilityEngine(
        _options(
            [
                _row(4000, "CALL", -0.20),
                _row(4025, "CALL", 0),
                _row(4050, "CALL", "invalid"),
                _row(4075, "CALL", float("inf")),
                _row(4100, "CALL", 1001),
                _row(4125, "CALL", 0.25),
            ]
        )
    )

    summary = engine.summary()

    assert summary["weighted_iv"] == pytest.approx(0.25)
    assert summary["minimum_iv"] == pytest.approx(0.25)
    assert summary["maximum_iv"] == pytest.approx(0.25)
    assert len(engine.curve()) == 1


def test_old_snapshot_without_volatility_block_stays_valid():
    legacy = {
        "source_name": "legacy.csv",
        "source_mode": "demo",
        "generated_at": "2026-07-23T18:00:00Z",
        "call_wall": 4100.0,
        "put_wall": 4000.0,
        "gamma_flip": 4050.0,
        "gamma_magnet": 4100.0,
        "gex_total": 484.4,
        "regime": "LONG GAMMA",
        "dealer_bias": "REVERTER MOVIMENTOS",
        "confidence": 60.5,
        "open_interest_summary": {"net_oi": 2887.0},
        "dealer_report": {"institutional_score": 51.92},
        "strike_table": [{"strike": 4000.0, "net_gex": -1093.52}],
    }

    restored = SnapshotEngine.deserialize(SnapshotEngine.serialize(legacy))

    assert "volatility_analysis" not in restored
    assert json.loads(SnapshotEngine.serialize(restored))["source_name"] == "legacy.csv"
