import type { AcademyVisualExample as VisualExample } from "@/lib/academyContent";

const toneStyles = {
  positive: "text-terminal-positive border-terminal-positive/35",
  negative: "text-terminal-negative border-terminal-negative/35",
  accent: "text-terminal-accent border-terminal-accent/35",
  warning: "text-terminal-flip border-terminal-flip/35",
  neutral: "text-terminal-text border-terminal-border",
};

export function AcademyVisualExample({
  example,
}: {
  example: VisualExample;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-terminal-border bg-terminal-bg/60">
      <div className="terminal-grid flex h-24 items-end gap-2 border-b border-terminal-border px-4 pb-3">
        {[42, 68, 54, 82, 61, 36].map((height, index) => (
          <span
            key={`${height}-${index}`}
            aria-hidden
            className={`flex-1 rounded-sm ${
              index === 3 ? "bg-terminal-accent/70" : "bg-terminal-border/70"
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
            {example.label}
          </p>
          <p
            className={`mt-1 font-mono text-sm font-semibold ${toneStyles[example.tone].split(" ")[0]}`}
          >
            {example.value}
          </p>
        </div>
        <span
          className={`max-w-52 rounded border px-2 py-1 text-right text-[9px] leading-4 ${toneStyles[example.tone]}`}
        >
          {example.context}
        </span>
      </div>
    </div>
  );
}
