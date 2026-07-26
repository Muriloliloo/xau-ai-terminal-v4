"""Institutional Gamma Exposure analytics by strike.

The engine composes the protected legacy ``GammaEngine`` so the established
gamma calculation remains the single source of truth. Exposure is expressed
in contract-gamma units: gamma × open interest × 100, with puts carrying a
negative sign. A spot-adjusted dollar GEX cannot be derived when the source
snapshot does not provide the underlying price.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from backend.core.gamma_engine import GammaEngine


class GammaExposureEngine:
    """Build a complete, additive GEX profile without changing legacy engines."""

    CONTRACT_MULTIPLIER = 100
    PRESSURE_THRESHOLD = 10.0

    def __init__(self, dataframe: pd.DataFrame):
        self.df = dataframe.copy()
        self.gamma_source = self._gamma_source(self.df)

    @staticmethod
    def _gamma_source(dataframe: pd.DataFrame) -> str:
        if "gamma" not in dataframe.columns:
            return "estimated"
        gamma = pd.to_numeric(dataframe["gamma"], errors="coerce")
        valid = gamma.notna() & (gamma > 0)
        if valid.all():
            return "provided"
        if not valid.any():
            return "estimated"
        return "mixed"

    @classmethod
    def _pressure_label(cls, score: float) -> str:
        if score > cls.PRESSURE_THRESHOLD:
            return "SUPPRESSIVE"
        if score < -cls.PRESSURE_THRESHOLD:
            return "AMPLIFYING"
        return "BALANCED"

    def calculate(self) -> pd.DataFrame:
        """Return row-level exposure using the protected GammaEngine formula."""
        return GammaEngine(self.df).calculate()

    def by_strike(self) -> pd.DataFrame:
        calculated = self.calculate().assign(
            call_gex=lambda frame: frame["gex"].where(
                frame["type"] == "CALL", 0.0
            ),
            put_gex=lambda frame: frame["gex"].where(
                frame["type"] == "PUT", 0.0
            ),
            call_oi=lambda frame: frame["open_interest"].where(
                frame["type"] == "CALL", 0.0
            ),
            put_oi=lambda frame: frame["open_interest"].where(
                frame["type"] == "PUT", 0.0
            ),
        )
        table = (
            calculated.groupby("strike", as_index=False)
            .agg(
                call_gex=("call_gex", "sum"),
                put_gex=("put_gex", "sum"),
                net_gex=("gex", "sum"),
                call_oi=("call_oi", "sum"),
                put_oi=("put_oi", "sum"),
            )
            .sort_values("strike")
            .reset_index(drop=True)
        )
        table["total_gex"] = table["call_gex"].abs() + table["put_gex"].abs()
        table["cumulative_net_gex"] = table["net_gex"].cumsum()
        gross_total = float(table["total_gex"].sum())
        table["contribution_pct"] = (
            table["total_gex"] / gross_total * 100 if gross_total > 0 else 0.0
        )
        pressure_scores = (
            table["net_gex"] / table["total_gex"].where(table["total_gex"] > 0)
        ).fillna(0.0) * 100
        table["dealer_pressure"] = pressure_scores.map(self._pressure_label)
        return table

    @staticmethod
    def _extreme(
        table: pd.DataFrame, *, positive: bool
    ) -> tuple[float | None, float]:
        candidates = (
            table[table["net_gex"] > 0]
            if positive
            else table[table["net_gex"] < 0]
        )
        if candidates.empty:
            return None, 0.0
        index = (
            candidates["net_gex"].idxmax()
            if positive
            else candidates["net_gex"].idxmin()
        )
        return (
            float(candidates.loc[index, "strike"]),
            float(candidates.loc[index, "net_gex"]),
        )

    def summary(self) -> dict[str, Any]:
        table = self.by_strike()
        call_gex = float(table["call_gex"].sum())
        put_gex = float(table["put_gex"].sum())
        net_gex = call_gex + put_gex
        total_gex = float(table["total_gex"].sum())
        pressure_score = net_gex / total_gex * 100 if total_gex > 0 else 0.0
        largest_positive_strike, largest_positive_gex = self._extreme(
            table, positive=True
        )
        largest_negative_strike, largest_negative_gex = self._extreme(
            table, positive=False
        )
        legacy = GammaEngine(self.df)

        return {
            "call_gex": round(call_gex, 4),
            "put_gex": round(put_gex, 4),
            "net_gex": round(net_gex, 4),
            "total_gex": round(total_gex, 4),
            "largest_positive_gex_strike": largest_positive_strike,
            "largest_positive_gex": round(largest_positive_gex, 4),
            "largest_negative_gex_strike": largest_negative_strike,
            "largest_negative_gex": round(largest_negative_gex, 4),
            "dealer_pressure": self._pressure_label(pressure_score),
            "dealer_pressure_score": round(pressure_score, 4),
            "gamma_flip": legacy.gamma_flip(),
            "gamma_magnet": legacy.gamma_magnet(),
            "gamma_source": self.gamma_source,
            "contract_multiplier": self.CONTRACT_MULTIPLIER,
            "spot_adjusted": False,
        }
