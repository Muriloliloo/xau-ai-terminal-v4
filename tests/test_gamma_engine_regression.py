from pathlib import Path

from backend.core.gamma_engine import GammaEngine
from backend.services.options_loader import load_options_csv

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_sample_gamma_results_are_unchanged():
    dataframe = load_options_csv(PROJECT_ROOT / "data" / "sample_options.csv")

    summary = GammaEngine(dataframe).summary()

    assert summary == {
        "Call Wall": 4100.0,
        "Put Wall": 4000.0,
        "Gamma Flip": 4050.0,
        "Gamma Magnet": 4100.0,
        "GEX Total": 484.4,
    }
