"use client";

import { GammaCurve } from "@/components/charts/GammaCurve";
import { GexMap } from "@/components/charts/GexMap";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type { InstitutionalLevels } from "@/types";

const optionDataProvider = getOptionDataProvider();

function loadAnalysis() {
  return optionDataProvider.load();
}

export function HeatmapWorkspace() {
  const { data, error, reload } = useRemoteResource(loadAnalysis);

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  const levels: InstitutionalLevels | undefined = data
    ? {
        callWall: data.call_wall,
        putWall: data.put_wall,
        gammaFlip: data.gamma_flip,
        gammaMagnet: data.gamma_magnet,
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
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <h2 className="mb-4 text-sm font-semibold">
              Mapa institucional por strike
            </h2>
            <GexMap
              rows={
                data.gamma_exposure_analysis?.curve_by_strike
                  ?? data.gex_by_strike
              }
              levels={levels}
            />
          </section>
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Curva de Gamma</h2>
            {data.gamma_exposure_analysis ? (
              <GammaCurve
                rows={data.gamma_exposure_analysis.curve_by_strike}
                gammaFlip={data.gamma_exposure_analysis.gamma_flip}
                gammaMagnet={data.gamma_exposure_analysis.gamma_magnet}
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
