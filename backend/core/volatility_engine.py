"""Implied-volatility analytics for validated option-chain snapshots."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd


class VolatilityEngine:
    """Analyze only volatility fields present in the source snapshot."""

    SKEW_BALANCE_THRESHOLD = 0.005
    MAX_NORMALIZED_IV = 10.0
    SPOT_COLUMNS = ("spot", "spot_price", "underlying_price", "underlying_spot")

    def __init__(self, dataframe: pd.DataFrame):
        self.df = dataframe.copy()
        self.has_previous_iv = "previous_iv" in self.df.columns

    @classmethod
    def normalize_iv(cls, values: pd.Series) -> pd.Series:
        """Normalize decimal or percentage-point IV values to decimals."""
        normalized = pd.to_numeric(values, errors="coerce").astype(float)
        normalized = normalized.where(np.isfinite(normalized))
        normalized = normalized.where(normalized <= 1, normalized / 100)
        return normalized.where(
            (normalized > 0) & (normalized <= cls.MAX_NORMALIZED_IV)
        )

    def calculate(self) -> pd.DataFrame:
        calculated = self.df.copy()
        source_iv = (
            calculated["iv"]
            if "iv" in calculated.columns
            else pd.Series(np.nan, index=calculated.index, dtype=float)
        )
        calculated["normalized_iv"] = self.normalize_iv(source_iv)

        source_previous_iv = (
            calculated["previous_iv"]
            if self.has_previous_iv
            else pd.Series(np.nan, index=calculated.index, dtype=float)
        )
        calculated["normalized_previous_iv"] = self.normalize_iv(
            source_previous_iv
        )
        calculated["iv_change"] = (
            calculated["normalized_iv"]
            - calculated["normalized_previous_iv"]
        )
        return calculated

    @staticmethod
    def _weighted_average(
        frame: pd.DataFrame,
        column: str,
        *,
        fallback_to_mean: bool = False,
    ) -> float | None:
        valid = frame[frame[column].notna()].copy()
        if valid.empty:
            return None
        weights = pd.to_numeric(
            valid["open_interest"], errors="coerce"
        ).fillna(0.0)
        weights = weights.where(weights > 0, 0.0)
        if float(weights.sum()) > 0:
            return float(np.average(valid[column], weights=weights))
        return float(valid[column].mean()) if fallback_to_mean else None

    @staticmethod
    def _mean_for_type(
        frame: pd.DataFrame, option_type: str
    ) -> float | None:
        values = frame.loc[
            (frame["type"] == option_type) & frame["normalized_iv"].notna(),
            "normalized_iv",
        ]
        return None if values.empty else float(values.mean())

    @staticmethod
    def _extreme_strike(
        frame: pd.DataFrame,
        column: str,
        *,
        maximum: bool,
        required_sign: int | None = None,
    ) -> tuple[float | None, float | None]:
        valid = frame[frame[column].notna()]
        if required_sign == 1:
            valid = valid[valid[column] > 0]
        elif required_sign == -1:
            valid = valid[valid[column] < 0]
        if valid.empty:
            return None, None
        index = valid[column].idxmax() if maximum else valid[column].idxmin()
        return float(valid.loc[index, "strike"]), float(valid.loc[index, column])

    @staticmethod
    def _side_skew(
        frame: pd.DataFrame, option_type: str
    ) -> float | None:
        side = frame[
            (frame["type"] == option_type) & frame["normalized_iv"].notna()
        ]
        if side.empty:
            return None
        curve = (
            side.groupby("strike", as_index=False)["normalized_iv"]
            .mean()
            .sort_values("strike")
        )
        if len(curve) < 2:
            return None
        low_iv = float(curve.iloc[0]["normalized_iv"])
        high_iv = float(curve.iloc[-1]["normalized_iv"])
        return high_iv - low_iv if option_type == "CALL" else low_iv - high_iv

    @classmethod
    def _skew_classification(cls, iv_skew: float | None) -> str | None:
        if iv_skew is None:
            return None
        if iv_skew > cls.SKEW_BALANCE_THRESHOLD:
            return "Puts mais caras"
        if iv_skew < -cls.SKEW_BALANCE_THRESHOLD:
            return "Calls mais caras"
        return "Equilibrado"

    @staticmethod
    def _expiry_label(frame: pd.DataFrame) -> pd.Series:
        if "expiry" in frame.columns:
            expiry = frame["expiry"].where(frame["expiry"].notna(), None)
            expiry = expiry.map(
                lambda value: (
                    str(value).strip()
                    if value is not None and str(value).strip()
                    else None
                )
            )
        else:
            expiry = pd.Series(None, index=frame.index, dtype=object)

        if "days_to_expiry" in frame.columns:
            days = pd.to_numeric(frame["days_to_expiry"], errors="coerce")
            fallback = days.map(
                lambda value: (
                    f"D+{value:g}"
                    if pd.notna(value) and np.isfinite(value) and value > 0
                    else None
                )
            )
            expiry = expiry.where(expiry.notna(), fallback)
        return expiry

    def _curve_group(self, frame: pd.DataFrame) -> dict[str, Any]:
        return {
            "call_iv": self._mean_for_type(frame, "CALL"),
            "put_iv": self._mean_for_type(frame, "PUT"),
            "weighted_iv": self._weighted_average(frame, "normalized_iv"),
        }

    def by_strike(self) -> pd.DataFrame:
        calculated = self.calculate()
        records = []
        for strike, group in calculated.groupby("strike", sort=True):
            if group["normalized_iv"].notna().sum() == 0:
                continue
            expiry_values = self._expiry_label(group).dropna().unique().tolist()
            records.append(
                {
                    "strike": float(strike),
                    **self._curve_group(group),
                    "expiry": (
                        str(expiry_values[0])
                        if len(expiry_values) == 1
                        else None
                    ),
                }
            )
        return pd.DataFrame(
            records,
            columns=["strike", "call_iv", "put_iv", "weighted_iv", "expiry"],
        )

    def by_expiry(self) -> pd.DataFrame:
        calculated = self.calculate()
        calculated["expiry_label"] = self._expiry_label(calculated)
        records = []
        for expiry, group in calculated.groupby(
            "expiry_label", dropna=False, sort=True
        ):
            valid = group[group["normalized_iv"].notna()]
            if valid.empty:
                continue
            records.append(
                {
                    "expiry": None if pd.isna(expiry) else str(expiry),
                    **self._curve_group(valid),
                    "minimum_iv": float(valid["normalized_iv"].min()),
                    "maximum_iv": float(valid["normalized_iv"].max()),
                }
            )
        return pd.DataFrame(
            records,
            columns=[
                "expiry",
                "call_iv",
                "put_iv",
                "weighted_iv",
                "minimum_iv",
                "maximum_iv",
            ],
        )

    def curve(self) -> pd.DataFrame:
        calculated = self.calculate()
        calculated["expiry_label"] = self._expiry_label(calculated)
        records = []
        for (expiry, strike), group in calculated.groupby(
            ["expiry_label", "strike"], dropna=False, sort=True
        ):
            if group["normalized_iv"].notna().sum() == 0:
                continue
            records.append(
                {
                    "strike": float(strike),
                    **self._curve_group(group),
                    "expiry": None if pd.isna(expiry) else str(expiry),
                }
            )
        return pd.DataFrame(
            records,
            columns=["strike", "call_iv", "put_iv", "weighted_iv", "expiry"],
        )

    def summary(self) -> dict[str, Any]:
        calculated = self.calculate()
        valid = calculated[calculated["normalized_iv"].notna()]
        call_iv = self._mean_for_type(calculated, "CALL")
        put_iv = self._mean_for_type(calculated, "PUT")
        iv_skew = (
            put_iv - call_iv
            if call_iv is not None and put_iv is not None
            else None
        )
        highest_strike, maximum_iv = self._extreme_strike(
            calculated, "normalized_iv", maximum=True
        )
        lowest_strike, minimum_iv = self._extreme_strike(
            calculated, "normalized_iv", maximum=False
        )
        increase_strike, largest_increase = self._extreme_strike(
            calculated,
            "iv_change",
            maximum=True,
            required_sign=1,
        )
        decrease_strike, largest_decrease = self._extreme_strike(
            calculated,
            "iv_change",
            maximum=False,
            required_sign=-1,
        )

        return {
            "weighted_iv": self._weighted_average(
                calculated, "normalized_iv"
            ),
            "call_iv": call_iv,
            "put_iv": put_iv,
            "iv_skew": iv_skew,
            "call_skew": self._side_skew(calculated, "CALL"),
            "put_skew": self._side_skew(calculated, "PUT"),
            "skew_classification": self._skew_classification(iv_skew),
            "minimum_iv": minimum_iv,
            "maximum_iv": maximum_iv,
            "highest_iv_strike": highest_strike,
            "lowest_iv_strike": lowest_strike,
            "weighted_iv_change": self._weighted_average(
                calculated, "iv_change"
            ),
            "largest_iv_increase_strike": increase_strike,
            "largest_iv_increase": largest_increase,
            "largest_iv_decrease_strike": decrease_strike,
            "largest_iv_decrease": largest_decrease,
            "has_iv": not valid.empty,
            "has_previous_iv": bool(
                self.has_previous_iv
                and calculated["iv_change"].notna().any()
            ),
        }

    def _valid_spot(self, calculated: pd.DataFrame) -> float | None:
        for column in self.SPOT_COLUMNS:
            if column not in calculated.columns:
                continue
            values = pd.to_numeric(
                calculated[column], errors="coerce"
            ).astype(float)
            valid = values[np.isfinite(values) & (values > 0)]
            if not valid.empty:
                return float(valid.iloc[0])
        return None

    def expected_move(self) -> dict[str, Any]:
        calculated = self.calculate()
        spot = self._valid_spot(calculated)
        if spot is None:
            return self._unavailable_expected_move(
                "Indisponível sem preço spot"
            )

        valid_iv = calculated[calculated["normalized_iv"].notna()]
        if valid_iv.empty:
            return self._unavailable_expected_move("Indisponível sem IV válida")

        if "days_to_expiry" not in calculated.columns:
            return self._unavailable_expected_move(
                "Indisponível sem prazo válido"
            )
        days = pd.to_numeric(
            calculated["days_to_expiry"], errors="coerce"
        ).astype(float)
        valid_days = days[
            calculated["normalized_iv"].notna()
            & np.isfinite(days)
            & (days > 0)
        ]
        if valid_days.empty:
            return self._unavailable_expected_move(
                "Indisponível sem prazo válido"
            )

        selected_days = float(valid_days.min())
        expiry_frame = calculated[
            (days == selected_days) & calculated["normalized_iv"].notna()
        ]
        selected_iv = self._weighted_average(
            expiry_frame,
            "normalized_iv",
            fallback_to_mean=True,
        )
        if selected_iv is None:
            return self._unavailable_expected_move("Indisponível sem IV válida")

        move_pct_decimal = selected_iv * math.sqrt(selected_days / 365)
        move_points = spot * move_pct_decimal
        expiry_values = self._expiry_label(expiry_frame).dropna()
        expiry = str(expiry_values.iloc[0]) if not expiry_values.empty else None
        return {
            "available": True,
            "reason": "Disponível com spot, IV e prazo do arquivo analisado",
            "expected_move_points": move_points,
            "expected_move_pct": move_pct_decimal * 100,
            "upper_level": spot + move_points,
            "lower_level": spot - move_points,
            "expiry": expiry,
        }

    @staticmethod
    def _unavailable_expected_move(reason: str) -> dict[str, Any]:
        return {
            "available": False,
            "reason": reason,
            "expected_move_points": None,
            "expected_move_pct": None,
            "upper_level": None,
            "lower_level": None,
            "expiry": None,
        }
