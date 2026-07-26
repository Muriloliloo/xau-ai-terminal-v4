import { StatusBadge } from "@/components/cards/StatusBadge";
import { formatNumber, formatPercent } from "@/lib/formatters";
import {
  generateMarketSummary,
  type SummaryTone,
} from "@/lib/marketSummary";
import type { AnalysisResponse } from "@/types";

interface AiMarketSummaryProps {
  data: AnalysisResponse;
}

interface SummaryMetricProps {
  icon: string;
  label: string;
  value: string;
  tone?: SummaryTone;
}

const toneClasses: Record<SummaryTone, string> = {
  positive: "text-terminal-positive",
  negative: "text-terminal-negative",
  warning: "text-terminal-flip",
  neutral: "text-terminal-text",
};

function SummaryMetric({
  icon,
  label,
  value,
  tone = "neutral",
}: SummaryMetricProps) {
  return (
    <div className="min-w-0 rounded-md border border-terminal-border bg-terminal-panel px-3 py-2.5">
      <p className="flex items-center gap-1.5 truncate text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p
        className={`mt-1.5 truncate font-mono text-xs font-semibold ${toneClasses[tone]}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function AiMarketSummary({ data }: AiMarketSummaryProps) {
  const summary = generateMarketSummary(data);
  const badgeTone =
    summary.regimeTone === "positive"
      ? "positive"
      : summary.regimeTone === "negative"
        ? "negative"
        : "warning";

  return (
    <section
      aria-labelledby="ai-market-summary-title"
      className="overflow-hidden rounded-lg border border-terminal-accent/40 bg-terminal-card shadow-[0_14px_36px_rgb(0_0_0/18%)]"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-terminal-accent to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="grid size-9 place-items-center rounded-md border border-terminal-accent/35 bg-terminal-accent/10 text-lg"
          >
            AI
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-terminal-accent">
              Inteligência determinística
            </p>
            <h2
              id="ai-market-summary-title"
              className="mt-0.5 text-sm font-semibold text-terminal-text"
            >
              🤖 AI Market Summary
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={summary.marketRegime} tone={badgeTone} />
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-terminal-border bg-terminal-panel px-3 py-1 font-mono text-[10px] ${toneClasses[summary.conviction.tone]}`}
          >
            <span aria-label={`${summary.conviction.stars} estrelas`}>
              {summary.conviction.stars}
            </span>
            <span>{summary.conviction.label}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 xl:grid-cols-7">
        <SummaryMetric
          icon="◈"
          label="Market Regime"
          value={summary.marketRegime}
          tone={summary.regimeTone}
        />
        <SummaryMetric
          icon="↔"
          label="Dealer Bias"
          value={summary.dealerBias}
        />
        <SummaryMetric
          icon="◎"
          label="Confidence"
          value={formatPercent(summary.confidence)}
          tone={summary.conviction.tone}
        />
        <SummaryMetric
          icon="γ"
          label="Gamma Environment"
          value={summary.gammaEnvironment}
          tone={summary.regimeTone}
        />
        <SummaryMetric
          icon="▲"
          label="Call Wall"
          value={formatNumber(summary.callWall)}
          tone="positive"
        />
        <SummaryMetric
          icon="▼"
          label="Put Wall"
          value={formatNumber(summary.putWall)}
          tone="negative"
        />
        <SummaryMetric
          icon="◇"
          label="Gamma Flip"
          value={formatNumber(summary.gammaFlip)}
          tone="warning"
        />
      </div>

      <div className="grid border-t border-terminal-border lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-4">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-muted">
            <span aria-hidden className="text-terminal-accent">▣</span>
            Institutional Analysis
          </p>
          <div className="mt-2.5 space-y-2">
            {summary.analysis.map((paragraph) => (
              <p
                key={paragraph}
                className="text-xs leading-5 text-terminal-text"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <aside className="border-t border-terminal-border bg-terminal-panel/55 p-4 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-muted">
            <span aria-hidden className="text-terminal-flip">⌁</span>
            Estratégia
          </p>
          <ul className="mt-2.5 space-y-2">
            {summary.strategy.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs leading-5 text-terminal-muted"
              >
                <span aria-hidden className="text-terminal-accent">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-terminal-border pt-3 text-[10px] leading-4 text-terminal-muted">
            Leitura educacional baseada exclusivamente no snapshot atual.
          </p>
        </aside>
      </div>
    </section>
  );
}
