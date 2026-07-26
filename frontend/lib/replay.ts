import {
  formatNumber,
  formatPercent,
  UNAVAILABLE_LABEL,
} from "@/lib/formatters";
import type { SnapshotSummary } from "@/types";
import type {
  ReplayComparisonMetric,
  ReplayRegimeEvent,
} from "@/types/replay";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatReplayTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? UNAVAILABLE_LABEL
    : timeFormatter.format(date);
}

export function sortSnapshotsChronologically(
  snapshots: SnapshotSummary[],
): SnapshotSummary[] {
  return [...snapshots].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return left.id - right.id;
    }
    return leftTime === rightTime ? left.id - right.id : leftTime - rightTime;
  });
}

export function replayRegime(regime: string): ReplayRegimeEvent {
  const normalized = regime.toUpperCase();
  if (normalized.includes("LONG")) {
    return {
      icon: "🟢",
      label: "Long Gamma",
      shortLabel: "LONG",
      tone: "positive",
    };
  }
  if (normalized.includes("SHORT")) {
    return {
      icon: "🔴",
      label: "Short Gamma",
      shortLabel: "SHORT",
      tone: "negative",
    };
  }
  return {
    icon: "🟡",
    label: "Neutral",
    shortLabel: "NEUTRAL",
    tone: "warning",
  };
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function numericChange(
  previous: number | null,
  current: number | null,
  suffix = "",
): string {
  if (previous == null || current == null) return UNAVAILABLE_LABEL;
  return `${signed(current - previous)}${suffix}`;
}

export function buildReplayComparison(
  previous: SnapshotSummary,
  current: SnapshotSummary,
): ReplayComparisonMetric[] {
  return [
    {
      label: "Dealer Bias",
      previousValue: previous.dealer_bias,
      currentValue: current.dealer_bias,
      change:
        previous.dealer_bias === current.dealer_bias ? "Mantido" : "Alterado",
    },
    {
      label: "Gamma",
      previousValue: previous.regime,
      currentValue: current.regime,
      change: previous.regime === current.regime ? "Mantido" : "Alterado",
    },
    {
      label: "Call Wall",
      previousValue: formatNumber(previous.call_wall),
      currentValue: formatNumber(current.call_wall),
      change: numericChange(previous.call_wall, current.call_wall),
    },
    {
      label: "Put Wall",
      previousValue: formatNumber(previous.put_wall),
      currentValue: formatNumber(current.put_wall),
      change: numericChange(previous.put_wall, current.put_wall),
    },
    {
      label: "Gamma Flip",
      previousValue: formatNumber(previous.gamma_flip),
      currentValue: formatNumber(current.gamma_flip),
      change: numericChange(previous.gamma_flip, current.gamma_flip),
    },
    {
      label: "Net GEX",
      previousValue: formatNumber(previous.gex_total),
      currentValue: formatNumber(current.gex_total),
      change: numericChange(previous.gex_total, current.gex_total),
    },
    {
      label: "Confidence",
      previousValue: formatPercent(previous.confidence),
      currentValue: formatPercent(current.confidence),
      change: numericChange(previous.confidence, current.confidence, " p.p."),
    },
    {
      label: "Open Interest",
      previousValue: formatNumber(previous.net_oi),
      currentValue: formatNumber(current.net_oi),
      change: numericChange(previous.net_oi, current.net_oi),
    },
  ];
}

function percentageChange(previous: number, current: number): number | null {
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function generateReplayAnalysis(
  previous: SnapshotSummary,
  current: SnapshotSummary,
): string[] {
  const start = formatReplayTime(previous.created_at);
  const end = formatReplayTime(current.created_at);
  const analysis: string[] = [];

  if (previous.call_wall !== current.call_wall) {
    analysis.push(
      `Entre ${start} e ${end} houve migração do Call Wall de ${formatNumber(previous.call_wall)} para ${formatNumber(current.call_wall)}.`,
    );
  }
  if (previous.dealer_bias !== current.dealer_bias) {
    analysis.push(
      `Dealer Bias mudou de ${previous.dealer_bias} para ${current.dealer_bias}.`,
    );
  }

  const gexChange = percentageChange(previous.gex_total, current.gex_total);
  if (gexChange != null && Math.abs(gexChange) >= 0.01) {
    analysis.push(
      `Net GEX ${gexChange > 0 ? "aumentou" : "reduziu"} ${formatPercent(Math.abs(gexChange))}.`,
    );
  }

  const oiChange = percentageChange(previous.net_oi, current.net_oi);
  if (oiChange != null && Math.abs(oiChange) >= 0.01) {
    analysis.push(
      `Open Interest líquido ${oiChange > 0 ? "aumentou" : "reduziu"} ${formatPercent(Math.abs(oiChange))}.`,
    );
  }

  if (previous.regime !== current.regime) {
    analysis.push(
      `O regime passou de ${previous.regime} para ${current.regime}.`,
    );
  }

  if (previous.gamma_flip !== current.gamma_flip) {
    analysis.push(
      `O Gamma Flip migrou de ${formatNumber(previous.gamma_flip)} para ${formatNumber(current.gamma_flip)}.`,
    );
  }

  if (!analysis.length) {
    analysis.push(
      `Entre ${start} e ${end}, os principais níveis e o regime permaneceram estáveis.`,
    );
  }
  return analysis;
}
