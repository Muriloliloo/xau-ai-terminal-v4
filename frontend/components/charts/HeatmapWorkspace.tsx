"use client";

import { useEffect } from "react";

import { LearnButton } from "@/components/academy/LearnButton";
import { GammaCurve } from "@/components/charts/GammaCurve";
import { GexMap } from "@/components/charts/GexMap";
import { OpenInterestDistribution } from "@/components/charts/OpenInterestDistribution";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { getInstitutionalLatest, getInstitutionalStatus } from "@/lib/api";
import {
  CME_BULLETIN_UPDATED_EVENT,
  cmeOpenInterestForChart,
} from "@/lib/cmeBulletin";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type { InstitutionalLevels } from "@/types";

const optionDataProvider = getOptionDataProvider();

async function loadWorkspace() {
  const state = await getInstitutionalStatus();
  if (state.data_mode === "real_eod") {
    return { state, analysis: null, cme: await getInstitutionalLatest() };
  }
  return { state, analysis: await optionDataProvider.load(), cme: null };
}

export function HeatmapWorkspace() {
  const { data, error, reload } = useRemoteResource(loadWorkspace);

  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CME_BULLETIN_UPDATED_EVENT, refresh);
  }, [reload]);

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  const levels: InstitutionalLevels | undefined = data?.analysis
    ? {
        callWall: data.analysis.call_wall,
        putWall: data.analysis.put_wall,
        gammaFlip: data.analysis.gamma_flip,
        gammaMagnet: data.analysis.gamma_magnet,
      }
    : undefined;

  return (
    <>
      <Header
        eyebrow="Distribuição por strike"
        title="Mapa GEX"
        description="Concentração, pressão dealer e curva calculadas exclusivamente pelo Gamma Exposure Engine."
        online={Boolean(data)}
      />
      {!data ? (
        <div className="loading-shimmer h-80 rounded-lg" />
      ) : data.state.data_mode === "real_eod" && data.cme !== null ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Mapa de Open Interest · CME</h2>
              <LearnButton indicatorLabel="Open Interest" showLabel />
            </div>
            {data.cme.open_interest ? (
              <OpenInterestDistribution analysis={cmeOpenInterestForChart({ ...data.cme.latest!, contracts: [] })!} />
            ) : (
              <p className="grid h-64 place-items-center text-sm text-terminal-muted">Open Interest insuficiente.</p>
            )}
            <p className="mt-3 text-[10px] text-terminal-muted">Este mapa representa Open Interest por strike. Não é Gamma Exposure.</p>
          </section>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">GEX / Gamma</h2>
              <span className="rounded border border-terminal-negative/30 px-2 py-1 text-[10px] text-terminal-negative">Indisponível</span>
            </div>
            <p className="grid h-64 place-items-center text-center text-sm text-terminal-muted">O CME Daily Bulletin não fornece Gamma por contrato; nenhum GEX demonstrativo foi usado.</p>
          </section>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                Mapa institucional por strike
              </h2>
              <LearnButton indicatorLabel="Dealer Pressure" showLabel />
            </div>
            <GexMap
              rows={
                data.analysis?.gamma_exposure_analysis?.curve_by_strike
                  ?? data.analysis?.gex_by_strike
                  ?? []
              }
              levels={levels}
            />
          </section>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Curva de Gamma</h2>
              <LearnButton indicatorLabel="GEX Total" showLabel />
            </div>
            {data.analysis?.gamma_exposure_analysis ? (
              <GammaCurve
                rows={data.analysis.gamma_exposure_analysis.curve_by_strike}
                gammaFlip={data.analysis.gamma_exposure_analysis.gamma_flip}
                gammaMagnet={data.analysis.gamma_exposure_analysis.gamma_magnet}
              />
            ) : (
              <p className="grid h-64 place-items-center text-sm text-terminal-muted">
                Snapshot legado sem curva GEX completa.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
