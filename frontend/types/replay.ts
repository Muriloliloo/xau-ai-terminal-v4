export type ReplayRegimeTone = "positive" | "negative" | "warning";

export interface ReplayRegimeEvent {
  icon: "🟢" | "🔴" | "🟡";
  label: "Long Gamma" | "Short Gamma" | "Neutral";
  shortLabel: "LONG" | "SHORT" | "NEUTRAL";
  tone: ReplayRegimeTone;
}

export interface ReplayComparisonMetric {
  label: string;
  previousValue: string;
  currentValue: string;
  change: string;
}
