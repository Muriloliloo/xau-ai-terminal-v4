"use client";

import { useState } from "react";

import { ReplayAnalysis } from "@/components/replay/ReplayAnalysis";
import {
  buildReplayComparison,
  formatReplayTime,
  sortSnapshotsChronologically,
} from "@/lib/replay";
import type { SnapshotSummary } from "@/types";

interface ReplayComparisonProps {
  snapshots: SnapshotSummary[];
  currentSnapshot: SnapshotSummary;
}

export function ReplayComparison({
  snapshots,
  currentSnapshot,
}: ReplayComparisonProps) {
  const [open, setOpen] = useState(false);
  const [snapshotAId, setSnapshotAId] = useState<number | null>(null);
  const [snapshotBId, setSnapshotBId] = useState<number | null>(null);
  const selectedAId = snapshotAId ?? snapshots[0].id;
  const defaultSnapshotB =
    currentSnapshot.id === snapshots[0].id
      ? snapshots[snapshots.length - 1]
      : currentSnapshot;
  const selectedBId = snapshotBId ?? defaultSnapshotB.id;
  const selectedA = snapshots.find((snapshot) => snapshot.id === selectedAId);
  const selectedB = snapshots.find((snapshot) => snapshot.id === selectedBId);
  const comparable = selectedA && selectedB && selectedA.id !== selectedB.id;
  const chronological = comparable
    ? sortSnapshotsChronologically([selectedA, selectedB])
    : [];
  const previous = chronological[0];
  const current = chronological[1];
  const metrics =
    previous && current ? buildReplayComparison(previous, current) : [];

  return (
    <section className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Comparação de snapshots</p>
          <p className="mt-1 text-xs text-terminal-muted">
            Compare estrutura, posicionamento e níveis entre dois momentos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          disabled={snapshots.length < 2}
          aria-expanded={open}
          className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent transition hover:bg-terminal-accent/15 disabled:opacity-40"
        >
          {open ? "Fechar comparação" : "Comparar"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-terminal-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Snapshot A",
                value: selectedAId,
                onChange: setSnapshotAId,
              },
              {
                label: "Snapshot B",
                value: selectedBId,
                onChange: setSnapshotBId,
              },
            ].map((selector) => (
              <label
                key={selector.label}
                className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted"
              >
                {selector.label}
                <select
                  value={selector.value}
                  onChange={(event) =>
                    selector.onChange(Number(event.target.value))
                  }
                  className="mt-1.5 w-full rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-xs normal-case tracking-normal text-terminal-text"
                >
                  {snapshots.map((snapshot) => (
                    <option key={snapshot.id} value={snapshot.id}>
                      #{snapshot.id} · {formatReplayTime(snapshot.created_at)} ·{" "}
                      {snapshot.regime}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {!comparable ? (
            <p className="mt-3 rounded-md border border-terminal-flip/30 bg-terminal-flip/5 px-3 py-2 text-xs text-terminal-flip">
              Selecione dois snapshots diferentes para comparar.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="overflow-x-auto rounded-md border border-terminal-border">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-terminal-panel text-terminal-muted">
                    <tr>
                      <th className="px-3 py-2.5">Indicador</th>
                      <th className="px-3 py-2.5">Valor anterior</th>
                      <th className="px-3 py-2.5 text-center">↓</th>
                      <th className="px-3 py-2.5">Valor atual</th>
                      <th className="px-3 py-2.5 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr
                        key={metric.label}
                        className="border-t border-terminal-border/70"
                      >
                        <td className="px-3 py-2.5 text-terminal-muted">
                          {metric.label}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {metric.previousValue}
                        </td>
                        <td className="px-3 py-2.5 text-center text-terminal-accent">
                          ↓
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {metric.currentValue}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-terminal-accent">
                          {metric.change}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ReplayAnalysis previous={previous} current={current} />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
