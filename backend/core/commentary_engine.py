"""Deterministic market commentary generation."""

from __future__ import annotations

from typing import Any


def build_market_commentary(summary, dealer):
    return (
        f"O mercado está em regime {dealer['regime']}. "
        f"O Call Wall está em {summary['Call Wall']} e o Put Wall em {summary['Put Wall']}. "
        f"O Gamma Flip está em {summary['Gamma Flip']} e o Gamma Magnet em {summary['Gamma Magnet']}. "
        f"A volatilidade esperada é {dealer['volatility'].lower()}, "
        f"com confiança estimada de {dealer['confidence']:.1f}%."
    )


def build_market_commentary_v2(
    *,
    gamma_summary: dict[str, Any],
    open_interest_summary: dict[str, Any],
    dealer_report: dict[str, Any],
) -> str:
    """Generate conditional, probabilistic commentary from the snapshot."""

    regime = dealer_report["regime"]
    intensity = str(dealer_report["intensity"]).lower()
    call_wall = gamma_summary.get("call_wall")
    put_wall = gamma_summary.get("put_wall")
    gamma_flip = gamma_summary.get("gamma_flip")
    call_oi = float(open_interest_summary["call_oi_total"])
    put_oi = float(open_interest_summary["put_oi_total"])
    net_gex = float(gamma_summary["net_gex_total"])

    if call_oi > put_oi:
        oi_reading = (
            "A leitura de Open Interest sugere maior peso relativo em Calls"
        )
    elif put_oi > call_oi:
        oi_reading = "A leitura de Open Interest sugere maior peso relativo em Puts"
    else:
        oi_reading = "A leitura de Open Interest permanece equilibrada entre Calls e Puts"

    if net_gex > 0:
        gex_reading = (
            "O Net GEX estimado é positivo e pode atuar como amortecedor de movimentos"
        )
    elif net_gex < 0:
        gex_reading = (
            "O Net GEX estimado é negativo e pode atuar como amplificador de movimentos"
        )
    else:
        gex_reading = "O Net GEX estimado está neutro e não define pressão dominante"

    principal_levels = (
        f"Os níveis principais são Call Wall {call_wall}, Put Wall {put_wall} "
        f"e Gamma Flip estimado {gamma_flip}."
    )
    factors = "; ".join(dealer_report["decision_factors"])

    return (
        f"O cenário favorece uma leitura de {regime} com intensidade {intensity}. "
        f"{principal_levels} {oi_reading}. {gex_reading}. "
        f"Há maior probabilidade de risco de reversão {str(dealer_report['reversal_risk']).lower()} "
        f"e risco de rompimento {str(dealer_report['breakout_risk']).lower()}, "
        "mas isso não garante continuidade. "
        f"Como ação educacional sugerida, {str(dealer_report['educational_action']).lower()} "
        f"O nível merece atenção em {dealer_report['critical_level']}; sua proximidade é "
        f"{str(dealer_report['critical_level_proximity']).lower()}. "
        f"Fatores que sustentam a leitura: {factors}. "
        "Limitações: o GEX e o Gamma Flip são estimados com os dados disponíveis, "
        "sem preço spot, curva completa ou fluxo em tempo real; o CSV demonstrativo "
        "não representa mercado ao vivo e a análise é educacional."
    )
