import { StatusBadge } from "@/components/cards/StatusBadge";
import { ConfidenceBar } from "@/components/institutional/ConfidenceBar";
import { formatCompact, formatNumber, formatPercent } from "@/lib/formatters";
import type { AnalysisResponse } from "@/types";

export function InstitutionalReport({ data }: { data: AnalysisResponse }) {
  const regimeTone = data.dealer_report.regime === "LONG GAMMA" ? "positive" : "warning";
  const oiContext = data.dealer_report.open_interest_context;
  const gexContext = data.dealer_report.gamma_exposure_context;

  return (
    <section className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border px-4 py-2.5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-terminal-accent">
            Relatório institucional
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">{data.report.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={data.dealer_report.intensity} tone="neutral" />
          <StatusBadge label={data.dealer_report.regime} tone={regimeTone} />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
              Explicação institucional
            </p>
            <p className="mt-1.5 text-xs leading-5 text-terminal-text">
              {data.dealer_report.commentary}
            </p>
          </div>
          <div className="rounded-md border-l-2 border-terminal-accent bg-terminal-panel px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-accent">
              Ação educacional sugerida
            </p>
            <p className="mt-1 text-xs leading-5 text-terminal-muted">
              {data.dealer_report.educational_action}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
              Fatores da decisão
            </p>
            <ul className="mt-1.5 grid gap-1 text-[11px] leading-4 text-terminal-muted sm:grid-cols-2">
              {data.dealer_report.decision_factors.map((factor) => (
                <li key={factor} className="flex gap-1.5">
                  <span aria-hidden className="text-terminal-accent">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-terminal-border bg-terminal-panel p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
                Rompimento
              </p>
              <p className="mt-1 text-xs font-semibold text-terminal-negative">
                {data.dealer_report.breakout_risk}
              </p>
            </div>
            <div className="rounded-md border border-terminal-border bg-terminal-panel p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
                Reversão
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-terminal-positive">
                {data.dealer_report.reversal_risk}
              </p>
            </div>
          </div>
          {gexContext ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-terminal-border bg-terminal-panel p-2">
                <p className="text-[9px] uppercase text-terminal-muted">Net GEX</p>
                <p
                  className={`mt-1 font-mono text-[11px] ${
                    gexContext.net_gex >= 0
                      ? "text-terminal-positive"
                      : "text-terminal-negative"
                  }`}
                >
                  {formatCompact(gexContext.net_gex)}
                </p>
              </div>
              <div className="rounded-md border border-terminal-border bg-terminal-panel p-2">
                <p className="text-[9px] uppercase text-terminal-muted">
                  Dealer Pressure
                </p>
                <p className="mt-1 font-mono text-[11px] text-terminal-accent">
                  {gexContext.dealer_pressure} ·{" "}
                  {formatNumber(gexContext.dealer_pressure_score)}
                </p>
              </div>
            </div>
          ) : null}
          <ConfidenceBar value={data.dealer_report.confidence} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-terminal-border bg-terminal-panel p-2">
              <p className="text-[9px] uppercase text-terminal-muted">Net OI</p>
              <p className="mt-1 font-mono text-[11px]">{formatCompact(data.open_interest_summary.net_oi)}</p>
            </div>
            <div className="rounded-md border border-terminal-border bg-terminal-panel p-2">
              <p className="text-[9px] uppercase text-terminal-muted">OI novo</p>
              <p className="mt-1 font-mono text-[11px] text-terminal-positive">
                {formatCompact(data.open_interest_summary.new_oi_total)}
              </p>
            </div>
            <div className="rounded-md border border-terminal-border bg-terminal-panel p-2">
              <p className="text-[9px] uppercase text-terminal-muted">Concentração</p>
              <p className="mt-1 font-mono text-[11px]">
                {formatPercent(data.open_interest_summary.max_concentration_pct)}
              </p>
            </div>
            <div
              title={
                oiContext
                  ? `Top 10 concentram ${formatPercent(oiContext.top_10_share_pct)} do OI`
                  : undefined
              }
              className="rounded-md border border-terminal-border bg-terminal-panel p-2"
            >
              <p className="text-[9px] uppercase text-terminal-muted">OI Score</p>
              <p className="mt-1 font-mono text-[11px] text-terminal-accent">
                {formatNumber(oiContext?.concentration_score)}
              </p>
            </div>
          </div>
          <p className="rounded-md border border-terminal-flip/25 bg-terminal-flip/5 px-3 py-2 text-[10px] leading-4 text-terminal-muted">
            Nível crítico estimado: {formatNumber(data.dealer_report.critical_level)}.{" "}
            {data.dealer_report.critical_level_proximity}. {data.report.educational_notice}
          </p>
        </div>
      </div>
    </section>
  );
}
