type StatusTone = "positive" | "negative" | "warning" | "neutral";

const styles: Record<StatusTone, string> = {
  positive: "border-terminal-positive/35 bg-terminal-positive/10 text-terminal-positive",
  negative: "border-terminal-negative/35 bg-terminal-negative/10 text-terminal-negative",
  warning: "border-terminal-flip/35 bg-terminal-flip/10 text-terminal-flip",
  neutral: "border-terminal-border bg-terminal-card text-terminal-muted",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${styles[tone]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
