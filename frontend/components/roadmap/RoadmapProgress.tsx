interface RoadmapProgressProps {
  label: string;
  value: number;
}

export function RoadmapProgress({ label, value }: RoadmapProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
        <span>{label}</span>
        <span className="text-terminal-text">{normalizedValue}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${normalizedValue}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalizedValue}
        className="h-1.5 overflow-hidden rounded-full bg-terminal-border/55"
      >
        <div
          className="h-full rounded-full bg-terminal-accent transition-[width] duration-200"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}
