from io import StringIO

import pandas as pd
import pytest

from backend.core.gamma_engine import GammaEngine
from backend.core.open_interest_engine import OpenInterestEngine
from backend.services.institutional_analysis_service import analyze_options
from backend.services.options_loader import load_options_csv


def _csv(*rows: str, include_previous: bool = True) -> StringIO:
    previous = ",previous_open_interest" if include_previous else ""
    return StringIO(
        f"strike,type,open_interest{previous},volume,gamma,aggressor\n"
        + "\n".join(rows)
    )


def test_valid_csv_calculates_open_interest_changes():
    options = load_options_csv(
        _csv(
            "4000,CALL,100,80,25,0.02,1",
            "4000,PUT,40,50,12,0.02,0",
        )
    )

    engine = OpenInterestEngine(options)
    summary = engine.summary()
    strike = engine.by_strike().iloc[0]

    assert summary["call_oi_total"] == 100
    assert summary["put_oi_total"] == 40
    assert summary["net_oi"] == 60
    assert summary["new_oi_total"] == 20
    assert summary["reduced_oi_total"] == 10
    assert strike["call_oi_change"] == 20
    assert strike["put_oi_change"] == -10
    assert strike["concentration_pct"] == 100


def test_missing_previous_oi_does_not_invent_new_open_interest():
    options = load_options_csv(
        _csv("4000,CALL,100,25,0.02,1", include_previous=False)
    )
    summary = OpenInterestEngine(options).summary()

    assert summary["has_previous_open_interest"] is False
    assert summary["new_oi_total"] == 0
    assert summary["reduced_oi_total"] == 0
    assert summary["largest_oi_increase_strike"] is None
    assert summary["largest_oi_decrease_strike"] is None


@pytest.mark.parametrize(
    ("option_type", "expected_regime", "missing_wall"),
    [
        ("CALL", "LONG GAMMA", "put_wall"),
        ("PUT", "SHORT GAMMA", "call_wall"),
    ],
)
def test_analysis_supports_csv_without_one_option_side(
    option_type, expected_regime, missing_wall
):
    analysis = analyze_options(
        _csv(
            f"4000,{option_type},100,80,25,0.02,1",
            f"4050,{option_type},60,50,15,0.01,0",
        )
    )

    assert analysis.dealer_v2.regime == expected_regime
    assert getattr(analysis.gamma_v2_summary, missing_wall) is None
    assert len(analysis.strike_table) == 2


def test_zero_open_interest_is_neutral():
    analysis = analyze_options(
        _csv(
            "4000,CALL,0,0,0,0.02,0",
            "4000,PUT,0,0,0,0.02,0",
        )
    )

    assert analysis.summary.total_gex == 0
    assert analysis.gamma_v2_summary.regime_strength == "NEUTRO"
    assert analysis.dealer_v2.regime == "NEUTRO"
    assert analysis.open_interest_summary.max_concentration_pct == 0


def test_missing_gamma_is_estimated_without_changing_legacy_formula():
    options = load_options_csv(
        _csv(
            "4000,CALL,100,80,25,,1",
            "4000,PUT,50,40,12,,0",
        )
    )
    calculated = GammaEngine(options).calculate()

    assert calculated["gamma"].notna().all()
    assert (calculated["gamma"] > 0).all()
    assert calculated.loc[calculated["type"] == "CALL", "gex"].iloc[0] > 0
    assert calculated.loc[calculated["type"] == "PUT", "gex"].iloc[0] < 0


@pytest.mark.parametrize(
    "field,value,error",
    [
        ("open_interest", -1, "open_interest"),
        ("previous_open_interest", -1, "previous_open_interest"),
        ("volume", -1, "volume"),
        ("strike", 0, "strike"),
    ],
)
def test_invalid_numeric_domains_are_rejected(field, value, error):
    row = {
        "strike": 4000,
        "type": "CALL",
        "open_interest": 10,
        "previous_open_interest": 8,
        "volume": 5,
        "gamma": 0.02,
        "aggressor": 0,
    }
    row[field] = value
    source = StringIO(
        "strike,type,open_interest,previous_open_interest,volume,gamma,aggressor\n"
        + ",".join(str(row[column]) for column in row)
    )

    with pytest.raises(ValueError, match=error):
        load_options_csv(source)


@pytest.mark.parametrize(
    ("dominant_type", "expected_strike_field"),
    [
        ("CALL", "largest_call_oi_strike"),
        ("PUT", "largest_put_oi_strike"),
    ],
)
def test_high_open_interest_concentration_is_detected(
    dominant_type, expected_strike_field
):
    other_type = "PUT" if dominant_type == "CALL" else "CALL"
    options = pd.DataFrame(
        [
            {
                "strike": 4000,
                "type": dominant_type,
                "open_interest": 1000,
                "previous_open_interest": 900,
                "volume": 50,
            },
            {
                "strike": 4050,
                "type": other_type,
                "open_interest": 1,
                "previous_open_interest": 1,
                "volume": 1,
            },
        ]
    )

    summary = OpenInterestEngine(options).summary()

    assert summary["max_concentration_pct"] > 99
    assert summary[expected_strike_field] == 4000


def test_commentary_is_probabilistic_and_not_a_definitive_order():
    analysis = analyze_options(
        _csv(
            "4000,CALL,100,80,25,0.02,1",
            "4050,PUT,70,60,20,0.02,0",
        )
    )
    commentary = analysis.commentary.lower()

    assert "o cenário favorece" in commentary
    assert "não garante continuidade" in commentary
    assert "limitações" in commentary
    assert "mercado ao vivo" in commentary
    assert all(
        forbidden not in commentary
        for forbidden in ("comprar", "vender", "compra", "venda")
    )
