import { formatTime } from "@/lib/formatters";
import type { MarketAlert } from "@/types";

const severityStyles: Record<MarketAlert["severity"], string> = {
  critical: "border-terminal-negative/45 bg-terminal-negative/7",
  warning: "border-terminal-flip/40 bg-terminal-flip/6",
  info: "border-terminal-accent/35 bg-terminal-accent/6",
  success: "border-terminal-positive/30 bg-terminal-positive/5",
};

const severityLabels: Record<MarketAlert["severity"], string> = {
  critical: "Crítico",
  warning: "Atenção",
  info: "Informativo",
  success: "Normal",
};

export function AlertCard({ alert }: { alert: MarketAlert }) {
  return (
    <article className={`rounded-md border px-3 py-2.5 ${severityStyles[alert.severity]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-terminal-muted">
          {severityLabels[alert.severity]} · {alert.state}
        </span>
        <time
          dateTime={alert.timestamp}
          className="font-mono text-[9px] text-terminal-muted"
        >
          {formatTime(alert.timestamp)}
        </time>
      </div>
      <h3 className="mt-1.5 text-xs font-semibold text-terminal-text">{alert.title}</h3>
      <p className="mt-1 text-[11px] leading-4 text-terminal-muted">{alert.description}</p>
    </article>
  );
}
