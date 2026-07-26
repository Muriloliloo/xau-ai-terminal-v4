import {
  formatReplayTime,
  replayRegime,
} from "@/lib/replay";
import { UNAVAILABLE_LABEL } from "@/lib/formatters";
import type { SnapshotSummary } from "@/types";

interface ReplayTimelineProps {
  snapshots: SnapshotSummary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const toneClasses = {
  positive: "border-terminal-positive bg-terminal-positive text-terminal-positive",
  negative: "border-terminal-negative bg-terminal-negative text-terminal-negative",
  warning: "border-terminal-flip bg-terminal-flip text-terminal-flip",
} as const;

export function ReplayTimeline({
  snapshots,
  selectedIndex,
  onSelect,
}: ReplayTimelineProps) {
  const selected = snapshots[selectedIndex];
  const minimumWidth = Math.max(640, snapshots.length * 120);

  return (
    <section
      aria-label="Timeline de snapshots"
      className="mb-3 rounded-lg border border-terminal-border bg-terminal-card p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Snapshot Timeline</p>
          <p className="mt-1 text-xs text-terminal-muted">
            Selecione um ponto ou mova o slider para reconstruir o mercado.
          </p>
        </div>
        <span className="rounded-full border border-terminal-accent/35 bg-terminal-accent/10 px-3 py-1 font-mono text-[10px] text-terminal-accent">
          Snapshot #{selected?.id ?? UNAVAILABLE_LABEL} ·{" "}
          {selected
            ? formatReplayTime(selected.created_at)
            : UNAVAILABLE_LABEL}
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="relative grid items-start"
          style={{
            gridTemplateColumns: `repeat(${snapshots.length}, minmax(110px, 1fr))`,
            minWidth: `${minimumWidth}px`,
          }}
        >
          <div className="absolute left-[55px] right-[55px] top-[31px] h-px bg-terminal-border" />
          {snapshots.map((snapshot, index) => {
            const event = replayRegime(snapshot.regime);
            const active = index === selectedIndex;
            return (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => onSelect(index)}
                aria-current={active ? "step" : undefined}
                aria-label={`Selecionar snapshot ${snapshot.id}, ${formatReplayTime(snapshot.created_at)}, ${event.label}`}
                className="relative z-10 flex min-w-0 flex-col items-center px-2 text-center"
              >
                <span className="font-mono text-[10px] text-terminal-muted">
                  {formatReplayTime(snapshot.created_at)}
                </span>
                <span
                  className={`mt-2 size-4 rounded-full border-2 transition-all duration-200 ${
                    toneClasses[event.tone]
                  } ${active ? "scale-125 ring-4 ring-terminal-accent/20" : "opacity-75"}`}
                />
                <span
                  className={`mt-2 font-mono text-[9px] font-semibold ${
                    active ? "text-terminal-text" : "text-terminal-muted"
                  }`}
                >
                  {event.icon} {event.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={Math.max(snapshots.length - 1, 0)}
          step={1}
          value={selectedIndex}
          onChange={(event) => onSelect(Number(event.target.value))}
          disabled={snapshots.length < 2}
          aria-label="Navegar pelos snapshots"
          className="h-1.5 w-full cursor-pointer accent-terminal-accent disabled:cursor-not-allowed"
        />
        <div className="mt-2 flex justify-between font-mono text-[9px] text-terminal-muted">
          <span>{formatReplayTime(snapshots[0].created_at)}</span>
          <span>{formatReplayTime(snapshots[snapshots.length - 1].created_at)}</span>
        </div>
      </div>
    </section>
  );
}
