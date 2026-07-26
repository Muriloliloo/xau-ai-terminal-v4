"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Header } from "@/components/layout/Header";
import { deleteSnapshot, getSnapshot, getSnapshots } from "@/lib/api";
import {
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "@/lib/formatters";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type { SnapshotDetail, SnapshotSummary } from "@/types";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

export function SnapshotsWorkspace() {
  const { data: snapshots, error, loading, reload } = useRemoteResource(getSnapshots);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparison, setComparison] = useState<SnapshotDetail[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  function toggle(snapshotId: number) {
    setComparison(null);
    setSelected((current) =>
      current.includes(snapshotId)
        ? current.filter((id) => id !== snapshotId)
        : current.length < 2
          ? [...current, snapshotId]
          : current,
    );
  }

  async function compareSelected() {
    if (selected.length !== 2) return;
    setComparing(true);
    setActionError(null);
    try {
      const details = await Promise.all(selected.map(getSnapshot));
      details.sort((left, right) => left.id - right.id);
      setComparison(details);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Falha na comparação.");
    } finally {
      setComparing(false);
    }
  }

  async function remove(snapshot: SnapshotSummary) {
    if (!window.confirm(`Excluir permanentemente o snapshot #${snapshot.id}?`)) return;
    setActionError(null);
    try {
      await deleteSnapshot(snapshot.id);
      setSelected((current) => current.filter((id) => id !== snapshot.id));
      setComparison(null);
      await reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Falha ao excluir.");
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <Header
        eyebrow="SQLite · Sprint 1"
        title="Snapshots institucionais"
        description="Análises salvas integralmente, ordenadas por data e disponíveis para reconstrução e comparação."
        online={snapshots !== null}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-terminal-border bg-terminal-card px-4 py-3">
        <p className="text-xs text-terminal-muted">
          Selecione exatamente dois registros para comparar suas estruturas.
        </p>
        <button
          type="button"
          onClick={() => void compareSelected()}
          disabled={selected.length !== 2 || comparing}
          className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent disabled:opacity-40"
        >
          {comparing ? "Comparando…" : `Comparar (${selected.length}/2)`}
        </button>
      </div>

      {actionError ? (
        <p className="mb-3 rounded-md border border-terminal-negative/40 bg-terminal-negative/5 px-3 py-2 text-xs text-terminal-negative">
          {actionError}
        </p>
      ) : null}

      {loading && snapshots === null ? (
        <div className="loading-shimmer h-56 rounded-lg" />
      ) : snapshots?.length === 0 ? (
        <EmptyState
          icon="◷"
          title="Nenhum snapshot salvo"
          description="Execute uma análise no Dashboard para criar o primeiro registro automático."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-terminal-border bg-terminal-card">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-terminal-border bg-terminal-panel text-terminal-muted">
              <tr>
                <th className="px-3 py-3">Comparar</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Regime</th>
                <th className="px-3 py-3 text-right">GEX</th>
                <th className="px-3 py-3 text-right">Net OI</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {snapshots?.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="border-b border-terminal-border/60 last:border-0 hover:bg-terminal-sidebar/60"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(snapshot.id)}
                      disabled={selected.length === 2 && !selected.includes(snapshot.id)}
                      onChange={() => toggle(snapshot.id)}
                      aria-label={`Selecionar snapshot ${snapshot.id}`}
                      className="accent-terminal-accent"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p>{formatTimestamp(snapshot.created_at)}</p>
                    <p className="mt-1 font-mono text-[9px] text-terminal-muted">
                      #{snapshot.id}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {snapshot.is_automatic ? "Automático" : "Manual"}
                  </td>
                  <td className="max-w-40 truncate px-3 py-3" title={snapshot.source_name}>
                    {snapshot.source_name}
                  </td>
                  <td className="px-3 py-3">{snapshot.regime}</td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatNumber(snapshot.gex_total)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatNumber(snapshot.net_oi)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatNumber(snapshot.institutional_score)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/snapshots/${snapshot.id}`}
                        className="rounded border border-terminal-accent/40 px-2 py-1.5 text-terminal-accent"
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => void remove(snapshot)}
                        className="rounded border border-terminal-negative/40 px-2 py-1.5 text-terminal-negative"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comparison?.length === 2 ? (
        <section className="mt-3 overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
          <div className="border-b border-terminal-border px-4 py-3">
            <p className="text-sm font-semibold">
              Comparação #{comparison[0].id} → #{comparison[1].id}
            </p>
            <p className="mt-1 text-xs text-terminal-muted">
              Variação calculada do snapshot mais antigo para o mais recente.
            </p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Regime",
                left: comparison[0].regime,
                right: comparison[1].regime,
                delta: comparison[0].regime === comparison[1].regime ? "Mantido" : "Alterado",
              },
              {
                label: "Net GEX legado",
                left: formatNumber(comparison[0].gex_total),
                right: formatNumber(comparison[1].gex_total),
                delta: signed(comparison[1].gex_total - comparison[0].gex_total),
              },
              {
                label: "Call GEX",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis?.call_gex,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis?.call_gex,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        comparison[1].analysis.gamma_exposure_analysis.call_gex
                          - comparison[0].analysis.gamma_exposure_analysis.call_gex,
                      )
                    : "—",
              },
              {
                label: "Put GEX",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis?.put_gex,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis?.put_gex,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        comparison[1].analysis.gamma_exposure_analysis.put_gex
                          - comparison[0].analysis.gamma_exposure_analysis.put_gex,
                      )
                    : "—",
              },
              {
                label: "GEX bruto",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis?.total_gex,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis?.total_gex,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        comparison[1].analysis.gamma_exposure_analysis.total_gex
                          - comparison[0].analysis.gamma_exposure_analysis.total_gex,
                      )
                    : "—",
              },
              {
                label: "Net GEX",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis?.net_gex,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis?.net_gex,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        comparison[1].analysis.gamma_exposure_analysis.net_gex
                          - comparison[0].analysis.gamma_exposure_analysis.net_gex,
                      )
                    : "—",
              },
              {
                label: "Dealer Pressure",
                left:
                  comparison[0].analysis.gamma_exposure_analysis
                    ?.dealer_pressure ?? "—",
                right:
                  comparison[1].analysis.gamma_exposure_analysis
                    ?.dealer_pressure ?? "—",
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                    ?.dealer_pressure
                  === comparison[1].analysis.gamma_exposure_analysis
                    ?.dealer_pressure
                    ? "Mantida"
                    : "Alterada",
              },
              {
                label: "Pressure Score",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis
                    ?.dealer_pressure_score,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis
                    ?.dealer_pressure_score,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        comparison[1].analysis.gamma_exposure_analysis
                          .dealer_pressure_score
                          - comparison[0].analysis.gamma_exposure_analysis
                            .dealer_pressure_score,
                      )
                    : "—",
              },
              {
                label: "Gamma Magnet GEX",
                left: formatNumber(
                  comparison[0].analysis.gamma_exposure_analysis?.gamma_magnet,
                ),
                right: formatNumber(
                  comparison[1].analysis.gamma_exposure_analysis?.gamma_magnet,
                ),
                delta:
                  comparison[0].analysis.gamma_exposure_analysis
                  && comparison[1].analysis.gamma_exposure_analysis
                    ? signed(
                        (
                          comparison[1].analysis.gamma_exposure_analysis
                            .gamma_magnet ?? 0
                        ) - (
                          comparison[0].analysis.gamma_exposure_analysis
                            .gamma_magnet ?? 0
                        ),
                      )
                    : "—",
              },
              {
                label: "IV ponderada",
                left: formatPercent(
                  comparison[0].analysis.volatility_analysis
                    ?.volatility_summary.weighted_iv,
                ),
                right: formatPercent(
                  comparison[1].analysis.volatility_analysis
                    ?.volatility_summary.weighted_iv,
                ),
                delta:
                  comparison[0].analysis.volatility_analysis
                  && comparison[1].analysis.volatility_analysis
                    ? `${signed(
                        (
                          comparison[1].analysis.volatility_analysis
                            .volatility_summary.weighted_iv ?? 0
                        ) - (
                          comparison[0].analysis.volatility_analysis
                            .volatility_summary.weighted_iv ?? 0
                        ),
                      )} p.p.`
                    : "—",
              },
              {
                label: "Call IV",
                left: formatPercent(
                  comparison[0].analysis.volatility_analysis
                    ?.volatility_summary.call_iv,
                ),
                right: formatPercent(
                  comparison[1].analysis.volatility_analysis
                    ?.volatility_summary.call_iv,
                ),
                delta:
                  comparison[0].analysis.volatility_analysis
                  && comparison[1].analysis.volatility_analysis
                    ? `${signed(
                        (
                          comparison[1].analysis.volatility_analysis
                            .volatility_summary.call_iv ?? 0
                        ) - (
                          comparison[0].analysis.volatility_analysis
                            .volatility_summary.call_iv ?? 0
                        ),
                      )} p.p.`
                    : "—",
              },
              {
                label: "Put IV",
                left: formatPercent(
                  comparison[0].analysis.volatility_analysis
                    ?.volatility_summary.put_iv,
                ),
                right: formatPercent(
                  comparison[1].analysis.volatility_analysis
                    ?.volatility_summary.put_iv,
                ),
                delta:
                  comparison[0].analysis.volatility_analysis
                  && comparison[1].analysis.volatility_analysis
                    ? `${signed(
                        (
                          comparison[1].analysis.volatility_analysis
                            .volatility_summary.put_iv ?? 0
                        ) - (
                          comparison[0].analysis.volatility_analysis
                            .volatility_summary.put_iv ?? 0
                        ),
                      )} p.p.`
                    : "—",
              },
              {
                label: "IV Skew",
                left: formatNumber(
                  comparison[0].analysis.volatility_analysis
                    ?.volatility_summary.iv_skew,
                ),
                right: formatNumber(
                  comparison[1].analysis.volatility_analysis
                    ?.volatility_summary.iv_skew,
                ),
                delta:
                  comparison[0].analysis.volatility_analysis
                  && comparison[1].analysis.volatility_analysis
                    ? `${signed(
                        (
                          comparison[1].analysis.volatility_analysis
                            .volatility_summary.iv_skew ?? 0
                        ) - (
                          comparison[0].analysis.volatility_analysis
                            .volatility_summary.iv_skew ?? 0
                        ),
                      )} p.p.`
                    : "—",
              },
              {
                label: "Expected Move",
                left: formatNumber(
                  comparison[0].analysis.volatility_analysis?.expected_move
                    .available
                    ? comparison[0].analysis.volatility_analysis.expected_move
                        .expected_move_points
                    : null,
                ),
                right: formatNumber(
                  comparison[1].analysis.volatility_analysis?.expected_move
                    .available
                    ? comparison[1].analysis.volatility_analysis.expected_move
                        .expected_move_points
                    : null,
                ),
                delta:
                  comparison[0].analysis.volatility_analysis?.expected_move
                    .available
                  && comparison[1].analysis.volatility_analysis?.expected_move
                    .available
                    ? signed(
                        (
                          comparison[1].analysis.volatility_analysis
                            .expected_move.expected_move_points ?? 0
                        ) - (
                          comparison[0].analysis.volatility_analysis
                            .expected_move.expected_move_points ?? 0
                        ),
                      )
                    : "—",
              },
              {
                label: "Net OI",
                left: formatNumber(comparison[0].net_oi),
                right: formatNumber(comparison[1].net_oi),
                delta: signed(comparison[1].net_oi - comparison[0].net_oi),
              },
              {
                label: "Call OI",
                left: formatNumber(
                  comparison[0].analysis.open_interest_summary.call_oi_total,
                ),
                right: formatNumber(
                  comparison[1].analysis.open_interest_summary.call_oi_total,
                ),
                delta: signed(
                  comparison[1].analysis.open_interest_summary.call_oi_total
                    - comparison[0].analysis.open_interest_summary.call_oi_total,
                ),
              },
              {
                label: "Put OI",
                left: formatNumber(
                  comparison[0].analysis.open_interest_summary.put_oi_total,
                ),
                right: formatNumber(
                  comparison[1].analysis.open_interest_summary.put_oi_total,
                ),
                delta: signed(
                  comparison[1].analysis.open_interest_summary.put_oi_total
                    - comparison[0].analysis.open_interest_summary.put_oi_total,
                ),
              },
              {
                label: "OI Concentration Score",
                left: formatNumber(
                  comparison[0].analysis.open_interest_analysis?.oi_concentration_score,
                ),
                right: formatNumber(
                  comparison[1].analysis.open_interest_analysis?.oi_concentration_score,
                ),
                delta:
                  comparison[0].analysis.open_interest_analysis
                  && comparison[1].analysis.open_interest_analysis
                    ? signed(
                        comparison[1].analysis.open_interest_analysis.oi_concentration_score
                          - comparison[0].analysis.open_interest_analysis.oi_concentration_score,
                      )
                    : "—",
              },
              {
                label: "Maior concentração OI",
                left: formatPercent(
                  comparison[0].analysis.open_interest_analysis
                    ?.largest_concentration_pct
                    ?? comparison[0].analysis.open_interest_summary.max_concentration_pct,
                ),
                right: formatPercent(
                  comparison[1].analysis.open_interest_analysis
                    ?.largest_concentration_pct
                    ?? comparison[1].analysis.open_interest_summary.max_concentration_pct,
                ),
                delta: `${(
                  (
                    comparison[1].analysis.open_interest_analysis
                      ?.largest_concentration_pct
                    ?? comparison[1].analysis.open_interest_summary.max_concentration_pct
                  ) - (
                    comparison[0].analysis.open_interest_analysis
                      ?.largest_concentration_pct
                    ?? comparison[0].analysis.open_interest_summary.max_concentration_pct
                  )
                ).toFixed(1)} p.p.`,
              },
              {
                label: "Score",
                left: formatNumber(comparison[0].institutional_score),
                right: formatNumber(comparison[1].institutional_score),
                delta: signed(
                  comparison[1].institutional_score - comparison[0].institutional_score,
                ),
              },
              {
                label: "Confiança",
                left: formatPercent(comparison[0].confidence),
                right: formatPercent(comparison[1].confidence),
                delta: `${comparison[1].confidence - comparison[0].confidence > 0 ? "+" : ""}${(
                  comparison[1].confidence - comparison[0].confidence
                ).toFixed(1)} p.p.`,
              },
              {
                label: "Call Wall",
                left: formatNumber(comparison[0].call_wall),
                right: formatNumber(comparison[1].call_wall),
                delta: signed(
                  (comparison[1].call_wall ?? 0) - (comparison[0].call_wall ?? 0),
                ),
              },
              {
                label: "Put Wall",
                left: formatNumber(comparison[0].put_wall),
                right: formatNumber(comparison[1].put_wall),
                delta: signed(
                  (comparison[1].put_wall ?? 0) - (comparison[0].put_wall ?? 0),
                ),
              },
              {
                label: "Gamma Flip",
                left: formatNumber(comparison[0].gamma_flip),
                right: formatNumber(comparison[1].gamma_flip),
                delta: signed(
                  (comparison[1].gamma_flip ?? 0) - (comparison[0].gamma_flip ?? 0),
                ),
              },
            ].map((metric) => (
              <article
                key={metric.label}
                className="rounded-md border border-terminal-border bg-terminal-panel p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
                  {metric.label}
                </p>
                <p className="mt-2 font-mono text-xs">{metric.left} → {metric.right}</p>
                <p className="mt-1 font-mono text-[10px] text-terminal-accent">
                  Δ {metric.delta}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
