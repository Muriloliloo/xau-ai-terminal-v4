"""Institutional analysis orchestration."""

from typing import Any

from backend.core.commentary_engine import build_market_commentary_v2
from backend.core.dealer_engine import DealerEngine
from backend.core.decision_engine import build_decision
from backend.core.gamma_engine import GammaEngine
from backend.core.gamma_exposure_engine import GammaExposureEngine
from backend.core.open_interest_engine import OpenInterestEngine
from backend.core.volatility_engine import VolatilityEngine
from backend.models.analysis import (
    DealerAnalysis,
    DealerV2Analysis,
    ExpectedMove,
    GammaExposureSummary,
    GammaSummary,
    GammaV2Summary,
    InstitutionalAnalysis,
    OpenInterestSummary,
    VolatilitySummary,
)
from backend.services.options_loader import load_options_csv


def analyze_options(source: Any) -> InstitutionalAnalysis:
    options = load_options_csv(source)
    gamma_engine = GammaEngine(options)
    summary_mapping = gamma_engine.summary()
    by_strike = gamma_engine.by_strike()
    gamma_v2_mapping = gamma_engine.v2_summary()
    gamma_v2_by_strike = gamma_engine.v2_by_strike()
    gamma_exposure_engine = GammaExposureEngine(options)
    gamma_exposure_mapping = gamma_exposure_engine.summary()
    gamma_exposure_by_strike = gamma_exposure_engine.by_strike()
    volatility_engine = VolatilityEngine(options)
    volatility_mapping = volatility_engine.summary()
    expected_move_mapping = volatility_engine.expected_move()
    volatility_curve = volatility_engine.curve()
    volatility_expiry_curve = volatility_engine.by_expiry()

    open_interest_engine = OpenInterestEngine(options)
    open_interest_mapping = open_interest_engine.summary()
    open_interest_by_strike = open_interest_engine.by_strike()
    strike_table = gamma_v2_by_strike.merge(
        open_interest_by_strike,
        on="strike",
        how="left",
        validate="one_to_one",
    )

    dealer_mapping = DealerEngine(summary_mapping["GEX Total"]).analyze()
    dealer_v2_mapping = DealerEngine(summary_mapping["GEX Total"]).analyze_v2(
        gamma_summary=gamma_v2_mapping,
        open_interest_summary=open_interest_mapping,
        strike_table=strike_table,
        options=options,
    )
    commentary = build_market_commentary_v2(
        gamma_summary=gamma_v2_mapping,
        open_interest_summary=open_interest_mapping,
        dealer_report=dealer_v2_mapping,
    )

    return InstitutionalAnalysis(
        options=options,
        by_strike=by_strike,
        strike_table=strike_table,
        summary=GammaSummary.from_mapping(summary_mapping),
        dealer=DealerAnalysis.from_mapping(dealer_mapping),
        open_interest_summary=OpenInterestSummary.from_mapping(
            open_interest_mapping
        ),
        gamma_v2_summary=GammaV2Summary.from_mapping(gamma_v2_mapping),
        gamma_exposure_summary=GammaExposureSummary.from_mapping(
            gamma_exposure_mapping
        ),
        gamma_exposure_by_strike=gamma_exposure_by_strike,
        volatility_summary=VolatilitySummary.from_mapping(
            volatility_mapping
        ),
        expected_move=ExpectedMove.from_mapping(expected_move_mapping),
        volatility_curve=volatility_curve,
        volatility_expiry_curve=volatility_expiry_curve,
        dealer_v2=DealerV2Analysis.from_mapping(dealer_v2_mapping),
        commentary=commentary,
        decision=build_decision(dealer_v2_mapping),
    )
