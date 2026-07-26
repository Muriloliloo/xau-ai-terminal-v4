import pandas as pd
import pytest

from backend.core.gamma_exposure_engine import GammaExposureEngine


def _options(rows):
    return pd.DataFrame(
        [
            {
                "strike": strike,
                "type": option_type,
                "open_interest": open_interest,
                "volume": 0,
                "gamma": gamma,
            }
            for strike, option_type, open_interest, gamma in rows
        ]
    )


def test_gamma_exposure_totals_and_curve_are_additive():
    engine = GammaExposureEngine(
        _options(
            [
                (4000, "CALL", 100, 0.02),
                (4000, "PUT", 50, 0.02),
                (4050, "CALL", 25, 0.01),
                (4050, "PUT", 50, 0.01),
            ]
        )
    )

    summary = engine.summary()
    curve = engine.by_strike()

    assert summary["call_gex"] == 225
    assert summary["put_gex"] == -150
    assert summary["net_gex"] == 75
    assert summary["total_gex"] == 375
    assert curve["contribution_pct"].sum() == pytest.approx(100)
    assert curve.iloc[-1]["cumulative_net_gex"] == pytest.approx(75)


def test_largest_positive_negative_magnet_and_flip():
    summary = GammaExposureEngine(
        _options(
            [
                (4000, "CALL", 20, 0.01),
                (4000, "PUT", 100, 0.01),
                (4050, "CALL", 120, 0.01),
                (4050, "PUT", 10, 0.01),
            ]
        )
    ).summary()

    assert summary["largest_negative_gex_strike"] == 4000
    assert summary["largest_negative_gex"] == -80
    assert summary["largest_positive_gex_strike"] == 4050
    assert summary["largest_positive_gex"] == 110
    assert summary["gamma_flip"] == 4050
    assert summary["gamma_magnet"] == 4050


@pytest.mark.parametrize(
    ("rows", "pressure"),
    [
        ([(4000, "CALL", 100, 0.01)], "SUPPRESSIVE"),
        ([(4000, "PUT", 100, 0.01)], "AMPLIFYING"),
        (
            [
                (4000, "CALL", 100, 0.01),
                (4000, "PUT", 100, 0.01),
            ],
            "BALANCED",
        ),
    ],
)
def test_dealer_pressure_classification(rows, pressure):
    assert GammaExposureEngine(_options(rows)).summary()["dealer_pressure"] == pressure


@pytest.mark.parametrize(
    ("gamma_values", "expected"),
    [
        ([0.02, 0.01], "provided"),
        ([None, None], "estimated"),
        ([0.02, None], "mixed"),
    ],
)
def test_gamma_source_is_explicit(gamma_values, expected):
    options = _options(
        [
            (4000, "CALL", 100, gamma_values[0]),
            (4000, "PUT", 50, gamma_values[1]),
        ]
    )

    summary = GammaExposureEngine(options).summary()

    assert summary["gamma_source"] == expected
    assert summary["contract_multiplier"] == 100
    assert summary["spot_adjusted"] is False


def test_zero_open_interest_returns_neutral_empty_extremes():
    summary = GammaExposureEngine(
        _options(
            [
                (4000, "CALL", 0, 0.02),
                (4050, "PUT", 0, 0.02),
            ]
        )
    ).summary()

    assert summary["total_gex"] == 0
    assert summary["dealer_pressure"] == "BALANCED"
    assert summary["dealer_pressure_score"] == 0
    assert summary["largest_positive_gex_strike"] is None
    assert summary["largest_negative_gex_strike"] is None
