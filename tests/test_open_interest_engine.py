import pandas as pd
import pytest

from backend.core.open_interest_engine import OpenInterestEngine


def _options(rows):
    return pd.DataFrame(
        [
            {
                "strike": strike,
                "type": option_type,
                "open_interest": open_interest,
                "previous_open_interest": open_interest,
                "volume": 0,
            }
            for strike, option_type, open_interest in rows
        ]
    )


def test_open_interest_totals_percentages_and_dominant_strike():
    engine = OpenInterestEngine(
        _options(
            [
                (4000, "CALL", 50),
                (4000, "PUT", 25),
                (4050, "CALL", 15),
                (4050, "PUT", 10),
            ]
        )
    )

    summary = engine.summary()
    table = engine.by_strike()

    assert summary["call_oi_total"] == 65
    assert summary["put_oi_total"] == 35
    assert summary["total_oi"] == 100
    assert summary["net_oi"] == 30
    assert summary["largest_concentration_strike"] == 4000
    assert summary["max_concentration_pct"] == 75
    assert table["concentration_pct"].sum() == pytest.approx(100)


def test_open_interest_concentration_score_uses_hhi():
    engine = OpenInterestEngine(
        _options(
            [
                (4000, "CALL", 75),
                (4050, "CALL", 25),
            ]
        )
    )

    assert engine.concentration_score() == 62.5
    assert engine.summary()["oi_concentration_score"] == 62.5


def test_single_strike_has_maximum_concentration_score():
    summary = OpenInterestEngine(
        _options([(4000, "CALL", 60), (4000, "PUT", 40)])
    ).summary()

    assert summary["max_concentration_pct"] == 100
    assert summary["oi_concentration_score"] == 100
    assert summary["top_10_strikes"][0]["percentage"] == 100


def test_zero_open_interest_has_zero_concentration():
    summary = OpenInterestEngine(
        _options([(4000, "CALL", 0), (4050, "PUT", 0)])
    ).summary()

    assert summary["total_oi"] == 0
    assert summary["largest_concentration_strike"] is None
    assert summary["max_concentration_pct"] == 0
    assert summary["oi_concentration_score"] == 0


def test_top_10_strikes_are_ranked_by_total_open_interest():
    rows = [
        (3900 + index * 10, "CALL", index)
        for index in range(1, 13)
    ]
    top = OpenInterestEngine(_options(rows)).top_strikes()

    assert len(top) == 10
    assert [row["rank"] for row in top] == list(range(1, 11))
    assert [row["total_oi"] for row in top] == list(
        map(float, range(12, 2, -1))
    )
    assert top[0]["strike"] == 4020


def test_top_strikes_rejects_non_positive_limit():
    engine = OpenInterestEngine(_options([(4000, "CALL", 10)]))

    with pytest.raises(ValueError, match="maior que zero"):
        engine.top_strikes(0)
