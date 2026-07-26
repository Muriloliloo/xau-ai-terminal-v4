from __future__ import annotations

from typing import Any

import pandas as pd


class DealerEngine:
    def __init__(self, gex_total: float):
        self.gex_total = float(gex_total)

    def analyze(self):
        if self.gex_total > 0:
            return {
                "regime": "LONG GAMMA",
                "dealer_bias": "REVERTER MOVIMENTOS",
                "volatility": "BAIXA / CONTROLADA",
                "confidence": min(95.0, 60.0 + abs(self.gex_total) / 1000),
            }
        if self.gex_total < 0:
            return {
                "regime": "SHORT GAMMA",
                "dealer_bias": "AMPLIFICAR MOVIMENTOS",
                "volatility": "ALTA / EXPANSIVA",
                "confidence": min(95.0, 60.0 + abs(self.gex_total) / 1000),
            }
        return {
            "regime": "NEUTRO",
            "dealer_bias": "SEM VIÉS DEFINIDO",
            "volatility": "INDEFINIDA",
            "confidence": 50.0,
        }

    @staticmethod
    def _clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
        return max(lower, min(upper, value))

    @staticmethod
    def _safe_balance(positive: float, negative: float) -> float:
        denominator = abs(positive) + abs(negative)
        return (positive - negative) / denominator if denominator else 0.0

    @staticmethod
    def _aggressor_balance(options: pd.DataFrame) -> float:
        if "aggressor" not in options.columns:
            return 0.0
        aggressor = pd.to_numeric(options["aggressor"], errors="coerce").fillna(0.0)
        volume = pd.to_numeric(options["volume"], errors="coerce").fillna(0.0)
        side = options["type"].map({"CALL": 1.0, "PUT": -1.0}).fillna(0.0)
        weighted = volume * aggressor * side
        denominator = float((volume * aggressor.abs()).sum())
        return float(weighted.sum()) / denominator if denominator else 0.0

    @staticmethod
    def _risk_levels(regime: str, score: float) -> tuple[str, str]:
        if regime == "SHORT GAMMA":
            breakout = "ALTO" if score <= 35 else "MODERADO"
            reversal = "BAIXO" if score <= 35 else "MODERADO"
            return breakout, reversal
        if regime == "LONG GAMMA":
            reversal = "ALTO" if score >= 65 else "MODERADO"
            breakout = "BAIXO" if score >= 65 else "MODERADO"
            return breakout, reversal
        return "MODERADO", "MODERADO"

    @staticmethod
    def _regime_and_intensity(regime_strength: str) -> tuple[str, str]:
        if "LONG GAMMA" in regime_strength:
            return "LONG GAMMA", (
                "FORTE" if regime_strength.startswith("FORTE") else "MODERADA"
            )
        if "SHORT GAMMA" in regime_strength:
            return "SHORT GAMMA", (
                "FORTE" if regime_strength.startswith("FORTE") else "MODERADA"
            )
        return "NEUTRO", "BAIXA"

    @staticmethod
    def _critical_proximity(gamma_summary: dict[str, Any]) -> str:
        gamma_flip = gamma_summary.get("gamma_flip")
        call_wall = gamma_summary.get("call_wall")
        put_wall = gamma_summary.get("put_wall")
        if gamma_flip is None:
            return "INDEFINIDA"
        if call_wall is None or put_wall is None:
            return "ESTRUTURAL; PREÇO SPOT INDISPONÍVEL"
        wall_distance = abs(float(call_wall) - float(put_wall))
        closest_wall = min(
            abs(float(gamma_flip) - float(call_wall)),
            abs(float(gamma_flip) - float(put_wall)),
        )
        if wall_distance and closest_wall / wall_distance <= 0.25:
            return "PRÓXIMO A UMA PAREDE; PREÇO SPOT INDISPONÍVEL"
        return "ENTRE AS PAREDES; PREÇO SPOT INDISPONÍVEL"

    def analyze_v2(
        self,
        *,
        gamma_summary: dict[str, Any],
        open_interest_summary: dict[str, Any],
        strike_table: pd.DataFrame,
        options: pd.DataFrame,
    ) -> dict[str, Any]:
        """Score a snapshot using explicit, deterministic institutional rules.

        The score is directional: 0 represents stronger short-gamma pressure,
        50 is neutral and 100 represents stronger long-gamma pressure.
        """

        call_gex = float(gamma_summary["call_gex_total"])
        put_gex_abs = abs(float(gamma_summary["put_gex_total"]))
        gamma_balance = self._safe_balance(call_gex, put_gex_abs)
        oi_balance = self._safe_balance(
            float(open_interest_summary["call_oi_total"]),
            float(open_interest_summary["put_oi_total"]),
        )

        call_change = float(strike_table["call_oi_change"].sum())
        put_change = float(strike_table["put_oi_change"].sum())
        oi_change_balance = self._safe_balance(call_change, put_change)

        call_volume = float(options.loc[options["type"] == "CALL", "volume"].sum())
        put_volume = float(options.loc[options["type"] == "PUT", "volume"].sum())
        volume_balance = self._safe_balance(call_volume, put_volume)
        aggressor_balance = self._aggressor_balance(options)

        score = self._clamp(
            50
            + 26 * gamma_balance
            + 8 * oi_balance
            + 6 * oi_change_balance
            + 6 * volume_balance
            + 4 * aggressor_balance
        )
        regime, intensity = self._regime_and_intensity(
            str(gamma_summary["regime_strength"])
        )
        breakout_risk, reversal_risk = self._risk_levels(regime, score)

        regional_concentration = gamma_summary["gex_concentration_by_region"]
        max_gex_concentration = max(regional_concentration.values(), default=0.0)
        max_oi_concentration = float(
            open_interest_summary["max_concentration_pct"]
        )
        confidence = self._clamp(
            50
            + abs(score - 50) * 0.7
            + min(18, max_oi_concentration * 0.3)
            + min(15, max_gex_concentration * 0.15),
            upper=95,
        )

        if regime == "LONG GAMMA":
            dealer_bias = "REVERTER MOVIMENTOS"
            expected_hedging = "HEDGE CONTRÁRIO À EXTENSÃO DOS MOVIMENTOS"
            expected_volatility = "BAIXA / CONTROLADA"
        elif regime == "SHORT GAMMA":
            dealer_bias = "AMPLIFICAR MOVIMENTOS"
            expected_hedging = "HEDGE A FAVOR DA EXTENSÃO DOS MOVIMENTOS"
            expected_volatility = "ALTA / EXPANSIVA"
        else:
            dealer_bias = "SEM VIÉS DEFINIDO"
            expected_hedging = "HEDGE DEPENDENTE DE CONFIRMAÇÃO E FLUXO"
            expected_volatility = "INDEFINIDA / TRANSIÇÃO"

        factors = [
            (
                "Net GEX positivo"
                if float(gamma_summary["net_gex_total"]) > 0
                else "Net GEX negativo"
                if float(gamma_summary["net_gex_total"]) < 0
                else "Net GEX neutro"
            ),
            (
                "Maior concentração de Call OI em "
                f"{open_interest_summary['largest_call_oi_strike']}"
                if oi_balance >= 0
                else "Maior concentração de Put OI em "
                f"{open_interest_summary['largest_put_oi_strike']}"
            ),
            (
                "Aumento líquido de Open Interest em Calls"
                if call_change > put_change
                else "Aumento líquido de Open Interest em Puts"
                if put_change > call_change
                else "Mudança líquida de Open Interest equilibrada"
            ),
            f"Concentração máxima de OI em um strike: {max_oi_concentration:.1f}%",
            f"Concentração regional máxima de GEX: {max_gex_concentration:.1f}%",
        ]
        if gamma_summary.get("gamma_flip") is not None:
            factors.append(
                "Gamma Flip estimado em "
                f"{float(gamma_summary['gamma_flip']):.2f}; não é uma curva real"
            )
        if gamma_summary.get("call_wall") is not None and gamma_summary.get(
            "put_wall"
        ) is not None:
            factors.append(
                "Distância entre paredes: "
                f"{abs(float(gamma_summary['call_wall']) - float(gamma_summary['put_wall'])):.2f}"
            )
        if abs(aggressor_balance) > 0.01:
            factors.append(
                "Fluxo agressor ponderado favorece Calls"
                if aggressor_balance > 0
                else "Fluxo agressor ponderado favorece Puts"
            )

        educational_action = (
            "Monitorar rejeições nos níveis principais e exigir confirmação antes "
            "de interpretar reversões."
            if regime == "LONG GAMMA"
            else "Monitorar aceitação além das paredes e exigir confirmação antes "
            "de interpretar continuidade."
            if regime == "SHORT GAMMA"
            else "Aguardar definição do fluxo ao redor do Gamma Flip estimado."
        )

        return {
            "regime": regime,
            "intensity": intensity,
            "dealer_bias": dealer_bias,
            "expected_hedging": expected_hedging,
            "expected_volatility": expected_volatility,
            "breakout_risk": breakout_risk,
            "reversal_risk": reversal_risk,
            "critical_level_proximity": self._critical_proximity(gamma_summary),
            "institutional_score": round(score, 2),
            "confidence": round(confidence, 2),
            "critical_level": gamma_summary.get("gamma_flip"),
            "decision_factors": factors,
            "educational_action": educational_action,
        }
