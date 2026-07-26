import type { ReactNode } from "react";

type MetricTone = "neutral" | "positive" | "negative" | "accent" | "flip";

const toneClasses: Record<MetricTone, string> = {
  neutral: "text-terminal-text",
  positive: "text-terminal-positive",
  negative: "text-terminal-negative",
  accent: "text-terminal-accent",
  flip: "text-terminal-flip",
};

interface MetricCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: MetricTone;
  tooltip?: string;
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
  tooltip,
}: MetricCardProps) {
  const valueSize =
    typeof value === "string" && value.length > 14 ? "text-sm" : "text-lg";

  return (
    <article
      title={tooltip}
      className="group relative h-[102px] max-h-[105px] min-w-0 rounded-lg border border-terminal-border bg-terminal-card px-3.5 py-3 shadow-[0_10px_24px_rgb(0_0_0/12%)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.13em] text-terminal-muted">
          {label}
        </p>
        {tooltip ? (
          <span
            aria-label={`Informação sobre ${label}`}
            className="grid size-4 shrink-0 place-items-center rounded-full border border-terminal-border font-mono text-[9px] text-terminal-muted"
          >
            i
          </span>
        ) : null}
      </div>
      <div className={`mt-2 truncate font-mono font-semibold ${valueSize} ${toneClasses[tone]}`}>
        {value}
      </div>
      {helper ? (
        <p className="mt-1 truncate text-[11px] text-terminal-muted">{helper}</p>
      ) : null}
      {tooltip ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-3 top-[calc(100%-4px)] z-40 hidden w-52 rounded-md border border-terminal-border bg-terminal-panel px-2.5 py-2 text-[10px] leading-4 text-terminal-text shadow-xl group-hover:block group-focus-within:block"
        >
          {tooltip}
        </span>
      ) : null}
    </article>
  );
}
