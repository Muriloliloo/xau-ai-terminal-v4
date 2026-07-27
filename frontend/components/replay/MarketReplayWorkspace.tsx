"use client";

import { useMemo, useState } from "react";

import { Dashboard } from "@/components/institutional/Dashboard";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { ReplayComparison } from "@/components/replay/ReplayComparison";
import { ReplaySnapshotList } from "@/components/replay/ReplaySnapshotList";
import { ReplayTimeline } from "@/components/replay/ReplayTimeline";
import { getCmeInstitutionalSnapshots, getInstitutionalStatus, getSnapshots } from "@/lib/api";
import {
  formatReplayTime,
  replayRegime,
  sortSnapshotsChronologically,
} from "@/lib/replay";
import { useRemoteResource } from "@/lib/useRemoteResource";

export function MarketReplayWorkspace() {
  const { data, error, loading, reload } = useRemoteResource(getSnapshots);
  const { data: institutionalState } = useRemoteResource(getInstitutionalStatus);
  const { data: cmeSnapshots } = useRemoteResource(getCmeInstitutionalSnapshots);
  const [selectedIndexState, setSelectedIndex] = useState<number | null>(null);
  const snapshots = useMemo(
    () => sortSnapshotsChronologically(data ?? []),
    [data],
  );
  const selectedIndex = Math.min(
    selectedIndexState ?? Math.max(snapshots.length - 1, 0),
    Math.max(snapshots.length - 1, 0),
  );
  const selectedSnapshot = snapshots[selectedIndex];

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  if (institutionalState?.data_mode === "real_eod") {
    return (
      <>
        <Header
          eyebrow="CME EOD · Open Interest"
          title="MARKET REPLAY"
          description="Replay de importações CME confirmadas, sem criar Gamma ou GEX onde a fonte não fornece esses campos."
          online={cmeSnapshots !== null}
        />
        {!cmeSnapshots?.length ? (
          <EmptyState icon="▶" title="Nenhum snapshot CME disponível" description="Salve um snapshot no Dashboard CME para iniciar a timeline." />
        ) : (
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="flex items-center justify-between gap-2 border-b border-terminal-border pb-3"><p className="text-sm font-semibold">Timeline CME · Open Interest</p><span className="text-[10px] text-terminal-muted">Gamma indisponível</span></div>
            <div className="mt-4 space-y-2">{[...cmeSnapshots].reverse().map((item) => <article key={item.id} className="rounded-md border border-terminal-border bg-terminal-panel p-3"><div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-mono text-terminal-accent">{item.bulletin_date ?? "Sem data"} · Snapshot CME #{item.id}</span><span className="text-terminal-muted">{item.freshness_type}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-terminal-muted sm:grid-cols-4"><span>OI {formatReplayMetric(item.open_interest_total)}</span><span>Calls {formatReplayMetric(item.call_open_interest)}</span><span>Puts {formatReplayMetric(item.put_open_interest)}</span><span>Volume {formatReplayMetric(item.volume_total)}</span></div></article>)}</div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <Header
        eyebrow="Sprint 6 · Snapshot Timeline"
        title="MARKET REPLAY"
        description="Navegue pelos snapshots salvos e reconstrua o dashboard exatamente como o mercado estava em cada momento."
        online={data !== null}
      />

      {loading && data === null ? (
        <div className="space-y-3">
          <div className="loading-shimmer h-52 rounded-lg" />
          <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="loading-shimmer h-80 rounded-lg" />
            <div className="loading-shimmer h-80 rounded-lg" />
          </div>
        </div>
      ) : snapshots.length === 0 ? (
        <EmptyState
          icon="▶"
          title="Nenhum snapshot disponível"
          description="Execute uma análise no Dashboard para criar o primeiro ponto da timeline."
        />
      ) : (
        <>
          <ReplayTimeline
            snapshots={snapshots}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />

          <div className="grid items-start gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <ReplaySnapshotList
              snapshots={snapshots}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />

            <div className="min-w-0 space-y-3">
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-terminal-border bg-terminal-card px-4 py-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-accent">
                    Snapshot atual
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    #{selectedSnapshot.id} ·{" "}
                    {formatReplayTime(selectedSnapshot.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span aria-hidden>
                    {replayRegime(selectedSnapshot.regime).icon}
                  </span>
                  <span className="font-mono text-xs">
                    {selectedSnapshot.regime}
                  </span>
                </div>
              </section>

              <ReplayComparison
                snapshots={snapshots}
                currentSnapshot={selectedSnapshot}
              />

              <div
                key={selectedSnapshot.id}
                className="replay-fade min-w-0"
              >
                <Dashboard snapshotId={selectedSnapshot.id} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function formatReplayMetric(value: number | null): string {
  return value == null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}
