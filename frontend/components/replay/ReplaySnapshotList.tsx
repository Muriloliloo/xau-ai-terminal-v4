import { formatReplayTime, replayRegime } from "@/lib/replay";
import type { SnapshotSummary } from "@/types";

interface ReplaySnapshotListProps {
  snapshots: SnapshotSummary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const toneClasses = {
  positive: "text-terminal-positive",
  negative: "text-terminal-negative",
  warning: "text-terminal-flip",
} as const;

export function ReplaySnapshotList({
  snapshots,
  selectedIndex,
  onSelect,
}: ReplaySnapshotListProps) {
  return (
    <aside className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-card lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="border-b border-terminal-border px-4 py-3">
        <p className="text-sm font-semibold">Snapshots</p>
        <p className="mt-1 text-xs text-terminal-muted">
          {snapshots.length} momentos salvos
        </p>
      </div>
      <div className="max-h-[480px] overflow-y-auto p-2 lg:max-h-[calc(100vh-7rem)]">
        {snapshots.map((snapshot, index) => {
          const event = replayRegime(snapshot.regime);
          const active = index === selectedIndex;
          return (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active ? "true" : undefined}
              className={`mb-1 w-full rounded-md border px-3 py-3 text-left transition-all duration-200 last:mb-0 ${
                active
                  ? "border-terminal-accent/50 bg-terminal-accent/10"
                  : "border-transparent hover:border-terminal-border hover:bg-terminal-panel"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">
                  Snapshot #{snapshot.id}
                </span>
                <span className="font-mono text-[10px] text-terminal-muted">
                  {formatReplayTime(snapshot.created_at)}
                </span>
              </div>
              <p
                className={`mt-2 flex items-center gap-1.5 font-mono text-[10px] ${toneClasses[event.tone]}`}
              >
                <span aria-hidden>{event.icon}</span>
                {snapshot.regime}
              </p>
              <p className="mt-1 truncate text-[10px] text-terminal-muted">
                {snapshot.dealer_bias}
              </p>
              <p className="mt-1 truncate font-mono text-[9px] text-terminal-muted">
                {snapshot.data_metadata
                  ? `${snapshot.data_metadata.provider} · ${snapshot.data_metadata.freshness_type}`
                  : "Fonte não registrada (snapshot legado)"}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
