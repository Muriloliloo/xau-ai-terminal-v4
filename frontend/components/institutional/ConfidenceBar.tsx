import { LearnButton } from "@/components/academy/LearnButton";

interface ConfidenceBarProps {
  value: number;
}

export function ConfidenceBar({ value }: ConfidenceBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-terminal-muted">
        <span className="flex items-center gap-1.5">
          Confiança do regime
          <LearnButton indicatorLabel="Confiança do regime" />
        </span>
        <span className="text-terminal-accent">{safeValue.toFixed(1)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Confiança do regime"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className="h-1.5 overflow-hidden rounded-full bg-terminal-border"
      >
        <div
          className="h-full rounded-full bg-terminal-accent transition-[width] duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
