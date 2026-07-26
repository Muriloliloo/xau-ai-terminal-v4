"""Open Interest analytics for validated option-chain snapshots."""

from __future__ import annotations

from typing import Any

import pandas as pd


class OpenInterestEngine:
    """Aggregate current and previous Open Interest without market assumptions."""

    def __init__(self, dataframe: pd.DataFrame):
        self.df = dataframe.copy()
        self.has_previous_open_interest = "previous_open_interest" in self.df.columns

    def calculate(self) -> pd.DataFrame:
        current = pd.to_numeric(self.df["open_interest"], errors="coerce").fillna(0.0)
        if self.has_previous_open_interest:
            previous = pd.to_numeric(
                self.df["previous_open_interest"], errors="coerce"
            ).fillna(current)
        else:
            # Missing history means "change unavailable", not that all OI is new.
            previous = current.copy()

        self.df["open_interest"] = current
        self.df["previous_open_interest"] = previous
        self.df["oi_change"] = current - previous
        return self.df

    def by_strike(self) -> pd.DataFrame:
        self.calculate()
        working = self.df.assign(
            call_oi=self.df["open_interest"].where(self.df["type"] == "CALL", 0.0),
            put_oi=self.df["open_interest"].where(self.df["type"] == "PUT", 0.0),
            previous_call_oi=self.df["previous_open_interest"].where(
                self.df["type"] == "CALL", 0.0
            ),
            previous_put_oi=self.df["previous_open_interest"].where(
                self.df["type"] == "PUT", 0.0
            ),
        )
        table = (
            working.groupby("strike", as_index=False)
            .agg(
                call_oi=("call_oi", "sum"),
                put_oi=("put_oi", "sum"),
                previous_call_oi=("previous_call_oi", "sum"),
                previous_put_oi=("previous_put_oi", "sum"),
            )
            .sort_values("strike")
            .reset_index(drop=True)
        )
        table["net_oi"] = table["call_oi"] - table["put_oi"]
        table["total_oi"] = table["call_oi"] + table["put_oi"]
        table["call_oi_change"] = table["call_oi"] - table["previous_call_oi"]
        table["put_oi_change"] = table["put_oi"] - table["previous_put_oi"]

        total_oi = float(table["total_oi"].sum())
        table["concentration_pct"] = (
            table["total_oi"] / total_oi * 100 if total_oi > 0 else 0.0
        )
        return table[
            [
                "strike",
                "call_oi",
                "put_oi",
                "net_oi",
                "total_oi",
                "previous_call_oi",
                "previous_put_oi",
                "call_oi_change",
                "put_oi_change",
                "concentration_pct",
            ]
        ]

    def top_strikes(self, limit: int = 10) -> list[dict[str, float | int]]:
        if limit < 1:
            raise ValueError("O limite de strikes deve ser maior que zero.")
        table = (
            self.by_strike()
            .sort_values(
                ["total_oi", "strike"],
                ascending=[False, True],
            )
            .head(limit)
            .reset_index(drop=True)
        )
        return [
            {
                "rank": index + 1,
                "strike": float(row.strike),
                "call_oi": float(row.call_oi),
                "put_oi": float(row.put_oi),
                "total_oi": float(row.total_oi),
                "net_oi": float(row.net_oi),
                "percentage": float(row.concentration_pct),
            }
            for index, row in table.iterrows()
        ]

    def concentration_score(self) -> float:
        """Return a 0–100 Herfindahl concentration score by strike."""
        table = self.by_strike()
        total_oi = float(table["total_oi"].sum())
        if total_oi <= 0:
            return 0.0
        shares = table["total_oi"] / total_oi
        return round(float((shares.pow(2).sum()) * 100), 4)

    @staticmethod
    def _strike_for_maximum(
        table: pd.DataFrame, value_column: str, *, require_positive: bool = True
    ) -> float | None:
        if table.empty:
            return None
        values = table[value_column]
        if require_positive and float(values.max()) <= 0:
            return None
        return float(table.loc[values.idxmax(), "strike"])

    @staticmethod
    def _strike_for_minimum(
        table: pd.DataFrame, value_column: str, *, require_negative: bool = True
    ) -> float | None:
        if table.empty:
            return None
        values = table[value_column]
        if require_negative and float(values.min()) >= 0:
            return None
        return float(table.loc[values.idxmin(), "strike"])

    def summary(self) -> dict[str, Any]:
        table = self.by_strike()
        call_total = float(table["call_oi"].sum())
        put_total = float(table["put_oi"].sum())
        total_oi = call_total + put_total
        total_change = table["call_oi_change"] + table["put_oi_change"]
        changes = pd.concat(
            [table["call_oi_change"], table["put_oi_change"]],
            ignore_index=True,
        )
        new_oi = changes.clip(lower=0)
        reduced_oi = -changes.clip(upper=0)
        largest_concentration_strike = self._strike_for_maximum(
            table, "concentration_pct"
        )

        return {
            "call_oi_total": call_total,
            "put_oi_total": put_total,
            "total_oi": total_oi,
            "net_oi": call_total - put_total,
            "largest_call_oi_strike": self._strike_for_maximum(table, "call_oi"),
            "largest_put_oi_strike": self._strike_for_maximum(table, "put_oi"),
            "new_oi_total": float(new_oi.sum()),
            "reduced_oi_total": float(reduced_oi.sum()),
            "largest_oi_increase_strike": self._strike_for_maximum(
                table.assign(total_change=total_change),
                "total_change",
            ),
            "largest_oi_decrease_strike": self._strike_for_minimum(
                table.assign(total_change=total_change),
                "total_change",
            ),
            "max_concentration_pct": (
                float(table["concentration_pct"].max()) if not table.empty else 0.0
            ),
            "largest_concentration_strike": largest_concentration_strike,
            "oi_concentration_score": self.concentration_score(),
            "top_10_strikes": self.top_strikes(),
            "has_previous_open_interest": self.has_previous_open_interest,
        }
