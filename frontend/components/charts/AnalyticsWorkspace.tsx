"use client";

import { GexProfile } from "@/components/charts/GexProfile";
import { MetricCard } from "@/components/cards/MetricCard";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";

const optionDataProvider = getOptionDataProvider();

function loadAnalysis() {
  return optionDataProvider.load();
}

export function AnalyticsWorkspace() {
  const { data, error, reload } = useRemoteResource(loadAnalysis);

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <Header
        eyebrow="Leitura agregada"
        title="Analytics"
        description="Resumo do snapshot demonstrativo atual; séries históricas ainda não estão habilitadas."
        online={Boolean(data)}
      />
      {!data ? (
        <div className="loading-shimmer h-80 rounded-lg" />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="GEX Total" value={formatNumber(data.gex_total)} tone="accent" />
            <MetricCard label="Regime" value={data.regime} tone="positive" />
            <MetricCard label="Confiança" value={formatPercent(data.confidence)} />
            <MetricCard label="Strikes" value={data.gex_by_strike.length} />
          </div>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Perfil atual</h2>
            <GexProfile rows={data.gex_by_strike} />
          </section>
        </>
      )}
    </>
  );
}
