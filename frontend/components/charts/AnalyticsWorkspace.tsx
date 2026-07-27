"use client";

import { useEffect } from "react";

import { LearnButton } from "@/components/academy/LearnButton";
import { GexProfile } from "@/components/charts/GexProfile";
import { OpenInterestDistribution } from "@/components/charts/OpenInterestDistribution";
import { MetricCard } from "@/components/cards/MetricCard";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { getInstitutionalLatest, getInstitutionalStatus } from "@/lib/api";
import {
  CME_BULLETIN_UPDATED_EVENT,
  cmeOpenInterestForChart,
} from "@/lib/cmeBulletin";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";

const optionDataProvider = getOptionDataProvider();

async function loadWorkspace() {
  const state = await getInstitutionalStatus();
  if (state.data_mode === "real_eod") {
    return { state, analysis: null, cme: await getInstitutionalLatest() };
  }
  return { state, analysis: await optionDataProvider.load(), cme: null };
}

export function AnalyticsWorkspace() {
  const { data, error, reload } = useRemoteResource(loadWorkspace);

  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
  }, [reload]);

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
      ) : data.state.data_mode === "real_eod" && data.cme !== null && data.cme.latest ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="OI Total" value={formatNumber(data.cme?.open_interest?.total_oi)} tone="accent" />
            <MetricCard label="Call OI" value={formatNumber(data.cme?.open_interest?.call_oi_total)} tone="positive" />
            <MetricCard label="Put OI" value={formatNumber(data.cme?.open_interest?.put_oi_total)} tone="negative" />
            <MetricCard label="Put/Call OI" value={formatNumber(data.cme?.open_interest?.put_call_oi_ratio)} tone="flip" />
            <MetricCard label="Volume" value={formatNumber(data.cme?.open_interest?.volume_total)} tone="accent" />
          </div>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Open Interest por strike · CME EOD</h2>
              <span className="text-[10px] text-terminal-muted">Gamma/GEX não fornecidos pela fonte</span>
            </div>
            <OpenInterestDistribution analysis={cmeOpenInterestForChart({ ...data.cme.latest, contracts: [] })!} />
          </section>
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="GEX Total" value={formatNumber(data.analysis?.gex_total)} tone="accent" />
            <MetricCard label="Regime" value={data.analysis?.regime ?? "—"} tone="positive" />
            <MetricCard label="Confiança" value={formatPercent(data.analysis?.confidence)} />
            <MetricCard label="Strikes" value={data.analysis?.gex_by_strike.length ?? 0} />
          </div>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Perfil atual</h2>
              <LearnButton indicatorLabel="GEX Total" showLabel />
            </div>
            <GexProfile rows={data.analysis?.gex_by_strike ?? []} />
          </section>
        </>
      )}
    </>
  );
}
