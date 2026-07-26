import { generateReplayAnalysis } from "@/lib/replay";
import type { SnapshotSummary } from "@/types";

interface ReplayAnalysisProps {
  previous: SnapshotSummary;
  current: SnapshotSummary;
}

export function ReplayAnalysis({
  previous,
  current,
}: ReplayAnalysisProps) {
  const paragraphs = generateReplayAnalysis(previous, current);

  return (
    <section className="rounded-md border border-terminal-accent/25 bg-terminal-accent/5 p-4">
      <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-accent">
        <span aria-hidden>▣</span>
        Replay Analysis
      </p>
      <div className="mt-3 space-y-2">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-xs leading-5 text-terminal-text">
            {paragraph}
          </p>
        ))}
      </div>
      <p className="mt-3 border-t border-terminal-border pt-3 text-[10px] text-terminal-muted">
        Análise determinística baseada exclusivamente nos snapshots selecionados.
      </p>
    </section>
  );
}
