import math
from typing import Any

import pandas as pd


class GammaEngine:
    def __init__(self, dataframe: pd.DataFrame):
        self.df = dataframe.copy()

    @staticmethod
    def _estimate_gamma(row):
        strike = row.get("strike")
        iv = row.get("iv", 0.20)
        days = row.get("days_to_expiry", 1)

        if pd.isna(strike) or strike <= 0:
            return 0.0
        if pd.isna(iv) or iv <= 0:
            iv = 0.20
        if pd.isna(days) or days <= 0:
            days = 1

        time = days / 365
        return 1 / (strike * iv * math.sqrt(2 * math.pi * time))

    def calculate(self):
        if "gamma" not in self.df.columns:
            self.df["gamma"] = pd.NA

        self.df["gamma"] = pd.to_numeric(self.df["gamma"], errors="coerce")
        missing_gamma = self.df["gamma"].isna() | (self.df["gamma"] <= 0)
        self.df.loc[missing_gamma, "gamma"] = self.df.loc[missing_gamma].apply(self._estimate_gamma, axis=1)

        sign = self.df["type"].map({"CALL": 1, "PUT": -1})
        self.df["gex"] = self.df["gamma"] * self.df["open_interest"] * 100 * sign
        return self.df

    def by_strike(self):
        self.calculate()
        result = (
            self.df.groupby("strike", as_index=False)
            .agg(
                call_gex=("gex", lambda values: values[values > 0].sum()),
                put_gex=("gex", lambda values: values[values < 0].sum()),
                net_gex=("gex", "sum"),
                open_interest=("open_interest", "sum"),
                volume=("volume", "sum"),
            )
            .sort_values("strike")
        )
        return result

    def call_wall(self):
        calls = self.df[self.df["type"] == "CALL"]
        return None if calls.empty else float(calls.loc[calls["open_interest"].idxmax(), "strike"])

    def put_wall(self):
        puts = self.df[self.df["type"] == "PUT"]
        return None if puts.empty else float(puts.loc[puts["open_interest"].idxmax(), "strike"])

    def gamma_flip(self):
        table = self.by_strike().copy()
        if table.empty:
            return None
        crossing = table[(table["net_gex"] * table["net_gex"].shift(1)) < 0]
        if not crossing.empty:
            return float(crossing.iloc[0]["strike"])
        call_wall, put_wall = self.call_wall(), self.put_wall()
        return None if call_wall is None or put_wall is None else round((call_wall + put_wall) / 2, 2)

    def gamma_magnet(self):
        table = self.by_strike()
        if table.empty:
            return None
        return float(table.loc[table["net_gex"].abs().idxmax(), "strike"])

    def total_gex(self):
        self.calculate()
        return round(float(self.df["gex"].sum()), 2)

    def summary(self):
        return {
            "Call Wall": self.call_wall(),
            "Put Wall": self.put_wall(),
            "Gamma Flip": self.gamma_flip(),
            "Gamma Magnet": self.gamma_magnet(),
            "GEX Total": self.total_gex(),
        }

    def v2_by_strike(self):
        """Return additive V2 analytics while preserving ``by_strike``."""
        table = self.by_strike().copy()
        table["cumulative_gex"] = table["net_gex"].cumsum()
        return table

    @staticmethod
    def _regime_strength(net_gex: float, gross_gex: float) -> str:
        normalized = net_gex / gross_gex if gross_gex > 0 else 0.0
        if normalized >= 0.25:
            return "FORTE LONG GAMMA"
        if normalized > 0.02:
            return "LONG GAMMA"
        if normalized <= -0.25:
            return "FORTE SHORT GAMMA"
        if normalized < -0.02:
            return "SHORT GAMMA"
        return "NEUTRO"

    @staticmethod
    def _distance(first: float | None, second: float | None) -> float | None:
        return None if first is None or second is None else abs(first - second)

    @staticmethod
    def _strongest_strike(
        table: pd.DataFrame, *, positive: bool
    ) -> float | None:
        candidates = table[table["net_gex"] > 0] if positive else table[table["net_gex"] < 0]
        if candidates.empty:
            return None
        index = (
            candidates["net_gex"].idxmax()
            if positive
            else candidates["net_gex"].idxmin()
        )
        return float(candidates.loc[index, "strike"])

    @staticmethod
    def _regional_concentration(
        table: pd.DataFrame, gamma_flip: float | None
    ) -> dict[str, float]:
        if table.empty:
            return {"below_flip": 0.0, "at_flip": 0.0, "above_flip": 0.0}
        magnitude = table["net_gex"].abs()
        total = float(magnitude.sum())
        if total <= 0 or gamma_flip is None:
            return {"below_flip": 0.0, "at_flip": 0.0, "above_flip": 0.0}
        return {
            "below_flip": round(
                float(magnitude[table["strike"] < gamma_flip].sum()) / total * 100,
                4,
            ),
            "at_flip": round(
                float(magnitude[table["strike"] == gamma_flip].sum()) / total * 100,
                4,
            ),
            "above_flip": round(
                float(magnitude[table["strike"] > gamma_flip].sum()) / total * 100,
                4,
            ),
        }

    def v2_summary(self) -> dict[str, Any]:
        """Build the extended summary without changing legacy calculations."""
        calculated = self.calculate()
        table = self.v2_by_strike()
        call_gex_total = float(calculated.loc[calculated["type"] == "CALL", "gex"].sum())
        put_gex_total = float(calculated.loc[calculated["type"] == "PUT", "gex"].sum())
        net_gex_total = call_gex_total + put_gex_total
        gross_gex_total = abs(call_gex_total) + abs(put_gex_total)
        call_wall = self.call_wall()
        put_wall = self.put_wall()
        gamma_flip = self.gamma_flip()

        return {
            "call_gex_total": round(call_gex_total, 2),
            "put_gex_total": round(put_gex_total, 2),
            "net_gex_total": round(net_gex_total, 2),
            "gross_gex_total": round(gross_gex_total, 2),
            "strongest_positive_gex_strike": self._strongest_strike(
                table, positive=True
            ),
            "strongest_negative_gex_strike": self._strongest_strike(
                table, positive=False
            ),
            "gamma_flip": gamma_flip,
            "gamma_magnet": self.gamma_magnet(),
            "call_wall": call_wall,
            "put_wall": put_wall,
            "distance_flip_to_call_wall": self._distance(gamma_flip, call_wall),
            "distance_flip_to_put_wall": self._distance(gamma_flip, put_wall),
            "gex_concentration_by_region": self._regional_concentration(
                table, gamma_flip
            ),
            "regime_strength": self._regime_strength(
                net_gex_total, gross_gex_total
            ),
        }
