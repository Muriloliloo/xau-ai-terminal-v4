"use client";

import { ErrorState } from "@/components/layout/ErrorState";
import { EmptyState } from "@/components/layout/EmptyState";
import { Header } from "@/components/layout/Header";
import { getHistory } from "@/lib/api";
import { formatNumber, formatPercent, formatTimestamp } from "@/lib/formatters";
import { useRemoteResource } from "@/lib/useRemoteResource";

export function HistoryWorkspace() {
  const { data: records, error, reload } = useRemoteResource(getHistory);

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <Header
        eyebrow="SQLite"
        title="Histórico legado"
        description="Registros resumidos da tabela institutional_levels. Snapshots completos estão na página dedicada."
        online={records !== null}
      />
      {records === null ? (
        <div className="loading-shimmer h-56 rounded-lg" />
      ) : records.length === 0 ? (
        <EmptyState
          icon="◫"
          title="Nenhum registro legado"
          description="Use a página Snapshots para consultar as análises completas persistidas."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-terminal-border bg-terminal-card">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-terminal-border text-terminal-muted">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Regime</th>
                <th className="px-3 py-3">Call Wall</th>
                <th className="px-3 py-3">Put Wall</th>
                <th className="px-3 py-3">GEX Total</th>
                <th className="px-3 py-3">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-terminal-border/50 last:border-0">
                  <td className="px-3 py-3">{formatTimestamp(record.created_at)}</td>
                  <td className="px-3 py-3">{record.regime ?? "—"}</td>
                  <td className="px-3 py-3 font-mono">{formatNumber(record.call_wall)}</td>
                  <td className="px-3 py-3 font-mono">{formatNumber(record.put_wall)}</td>
                  <td className="px-3 py-3 font-mono">{formatNumber(record.gex_total)}</td>
                  <td className="px-3 py-3 font-mono">{formatPercent(record.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
