import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/constants";
import { formatCompact, formatNumber } from "@/lib/formatters";
import type { AnalysisResponse, MarketAlert } from "@/types";

export function findDominantStrike(data: AnalysisResponse) {
  return data.gex_by_strike.reduce(
    (dominant, row) =>
      Math.abs(row.net_gex) > Math.abs(dominant.net_gex) ? row : dominant,
    data.gex_by_strike[0],
  );
}

export function buildMarketAlerts(data: AnalysisResponse): MarketAlert[] {
  const timestamp = data.generated_at;
  const dominant = findDominantStrike(data);
  const gammaFlipMessage =
    data.alerts.find((alert) => alert.toLowerCase().includes("gamma flip")) ??
    `Nível de atenção calculado em ${formatNumber(data.gamma_flip)}.`;

  const alerts: MarketAlert[] = [
    {
      id: "gamma-flip",
      severity: "warning",
      title: "Gamma Flip",
      description: gammaFlipMessage,
      timestamp,
      state: "active",
    },
    {
      id: "gex-concentration",
      severity: "info",
      title: "Maior concentração de GEX",
      description: dominant
        ? `Strike ${formatNumber(dominant.strike)} concentra ${formatCompact(
            dominant.net_gex,
          )} de Net GEX.`
        : "Nenhuma concentração pôde ser calculada.",
      timestamp,
      state: dominant ? "active" : "monitoring",
    },
    {
      id: "regime-change",
      severity: data.regime === "SHORT GAMMA" ? "warning" : "info",
      title: "Mudança de regime",
      description: `Regime atual: ${data.regime}. Não há snapshot anterior persistido para confirmar transição.`,
      timestamp,
      state: "monitoring",
    },
    {
      id: "confidence",
      severity:
        data.confidence < LOW_CONFIDENCE_THRESHOLD ? "warning" : "success",
      title:
        data.confidence < LOW_CONFIDENCE_THRESHOLD
          ? "Confiança baixa"
          : "Confiança monitorada",
      description: `Confiança do regime em ${data.confidence.toFixed(
        1,
      )}%; limiar operacional de atenção em ${LOW_CONFIDENCE_THRESHOLD}%.`,
      timestamp,
      state:
        data.confidence < LOW_CONFIDENCE_THRESHOLD ? "active" : "resolved",
    },
    {
      id: "price",
      severity: data.price == null ? "warning" : "success",
      title: data.price == null ? "Ausência de preço" : "Preço disponível",
      description:
        data.price == null
          ? "O backend ainda não fornece cotação em tempo real; nenhum valor foi estimado."
          : `Cotação recebida da origem ${data.source_name}.`,
      timestamp,
      state: data.price == null ? "active" : "resolved",
    },
    {
      id: "source-age",
      severity: data.source_is_stale ? "warning" : "success",
      title: data.source_is_stale ? "CSV desatualizado" : "Fonte verificada",
      description: data.source_is_stale
        ? "A amostra local tem mais de 24 horas e deve ser tratada apenas como referência."
        : `Snapshot processado a partir de ${data.source_name}.`,
      timestamp,
      state: data.source_is_stale ? "active" : "resolved",
    },
  ];

  const handledEngineAlerts = data.alerts.filter(
    (alert) => !alert.toLowerCase().includes("gamma flip"),
  );
  handledEngineAlerts.forEach((description, index) => {
    alerts.splice(2 + index, 0, {
      id: `engine-${index}`,
      severity: "warning",
      title: "Regra do engine",
      description,
      timestamp,
      state: "active",
    });
  });

  return alerts;
}
