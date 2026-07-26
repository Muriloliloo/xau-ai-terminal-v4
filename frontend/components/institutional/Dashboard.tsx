"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertPanel } from "@/components/cards/AlertPanel";
import { LearnButton } from "@/components/academy/LearnButton";
import { MetricCard } from "@/components/cards/MetricCard";
import { GammaCurve } from "@/components/charts/GammaCurve";
import { GexMap } from "@/components/charts/GexMap";
import { GexProfile } from "@/components/charts/GexProfile";
import { OpenInterestDistribution } from "@/components/charts/OpenInterestDistribution";
import { VolatilitySmile } from "@/components/charts/VolatilitySmile";
import { AiMarketSummary } from "@/components/institutional/AiMarketSummary";
import { InstitutionalReport } from "@/components/institutional/InstitutionalReport";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { MarketHeader } from "@/components/layout/MarketHeader";
import { StrikeTable } from "@/components/tables/StrikeTable";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import {
  createSnapshot,
  getHealth,
  getSnapshot,
} from "@/lib/api";
import { buildMarketAlerts, findDominantStrike } from "@/lib/alerts";
import { formatCompact, formatNumber, formatPercent } from "@/lib/formatters";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type {
  AnalysisResponse,
  HealthResponse,
  InstitutionalLevels,
  MarketAlert,
} from "@/types";

interface DashboardData {
  analysis: AnalysisResponse;
  health: HealthResponse;
}

const optionDataProvider = getOptionDataProvider();

async function loadDashboard(): Promise<DashboardData> {
  const [health, analysis] = await Promise.all([
    getHealth(),
    optionDataProvider.load(),
  ]);
  return { analysis, health };
}

export function Dashboard({ snapshotId }: { snapshotId?: number }) {
  const loader = useCallback(async (): Promise<DashboardData> => {
    if (!snapshotId) return loadDashboard();
    const [health, snapshot] = await Promise.all([
      getHealth(),
      getSnapshot(snapshotId),
    ]);
    return { analysis: snapshot.analysis, health };
  }, [snapshotId]);
  const { data: resource, error, loading, reload } = useRemoteResource(loader);
  const { preferences } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const data = resource?.analysis ?? null;

  useEffect(() => {
    if (!preferences.autoRefresh || snapshotId) return;
    const timer = window.setInterval(() => void reload(), 60_000);
    return () => window.clearInterval(timer);
  }, [preferences.autoRefresh, reload, snapshotId]);

  async function saveCurrentSnapshot() {
    if (!data) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const saved = await createSnapshot(data, "Snapshot manual");
      setSaveStatus(`Snapshot #${saved.id} salvo`);
    } catch {
      setSaveStatus("Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    const apiFailureAlert: MarketAlert = {
      id: "api-failure",
      severity: "critical",
      title: "Falha de API",
      description: error,
      timestamp: new Date().toISOString(),
      state: "active",
    };

    return (
      <>
        <MarketHeader
          data={null}
          apiStatus="error"
          loading={loading}
          onRefresh={() => void reload()}
        />
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <ErrorState
            title="Provider indisponível"
            message={error}
            onRetry={() => void reload()}
          />
          <AlertPanel alerts={[apiFailureAlert]} />
        </div>
      </>
    );
  }

  if (!data || loading) {
    return (
      <>
        <MarketHeader
          data={data}
          apiStatus="loading"
          loading
          onRefresh={() => void reload()}
        />
        <DashboardSkeleton />
      </>
    );
  }

  const regimeTone = data.regime === "LONG GAMMA" ? "positive" : "negative";
  const gexTone = data.gex_total >= 0 ? "positive" : "negative";
  const dominantStrike = findDominantStrike(data);
  const levels: InstitutionalLevels = {
    callWall: data.call_wall,
    putWall: data.put_wall,
    gammaFlip: data.gamma_flip,
    gammaMagnet: data.gamma_magnet,
  };
  const alerts = buildMarketAlerts(data);
  const openInterest = data.open_interest_analysis;
  const gammaExposure = data.gamma_exposure_analysis;
  const volatility = data.volatility_analysis;

  return (
    <>
      <MarketHeader
        data={data}
        apiStatus={resource?.health.status === "ok" ? "connected" : "error"}
        loading={loading}
        onRefresh={() => void reload()}
        onSave={() => void saveCurrentSnapshot()}
        saving={saving}
        saveStatus={saveStatus}
      />

      <div className="space-y-3">
        <AiMarketSummary data={data} />

        <section aria-label="Estado do mercado" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard
            label="Regime"
            value={data.regime}
            tone={regimeTone}
            helper="Posicionamento atual"
            tooltip="Regime derivado do sinal do GEX Total pelos engines existentes."
          />
          <MetricCard
            label="Dealer Bias"
            value={data.dealer_bias}
            helper="Comportamento provável"
            tooltip="Leitura do comportamento dealer associada ao regime de gamma."
          />
          <MetricCard
            label="Confiança"
            value={formatPercent(data.confidence)}
            tone="accent"
            helper="Estimativa do engine"
            tooltip="Confiança heurística do regime, expressa de zero a cem por cento."
          />
          <MetricCard
            label="Risco"
            value={data.risk}
            tone={regimeTone}
            helper="Volatilidade esperada"
            tooltip="Classificação de volatilidade retornada pelo Dealer Engine."
          />
          <MetricCard
            label="GEX Total"
            value={formatNumber(data.gex_total)}
            tone={gexTone}
            helper="Exposição líquida"
            tooltip="GEX estimado com os dados disponíveis; não representa uma curva completa com preço spot."
          />
        </section>

        <section
          id="gamma-levels"
          aria-label="Níveis institucionais"
          className="scroll-mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5"
        >
          <MetricCard
            label="Call Wall"
            value={formatNumber(data.call_wall)}
            tone="positive"
            tooltip="Strike CALL com maior Open Interest no snapshot."
          />
          <MetricCard
            label="Put Wall"
            value={formatNumber(data.put_wall)}
            tone="negative"
            tooltip="Strike PUT com maior Open Interest no snapshot."
          />
          <MetricCard
            label="Gamma Flip"
            value={formatNumber(data.gamma_flip)}
            tone="flip"
            tooltip="Nível estimado por mudança de sinal ou ponto médio entre as walls; não é um Gamma Flip real."
          />
          <MetricCard
            label="Gamma Magnet"
            value={formatNumber(data.gamma_magnet)}
            tone="accent"
            tooltip="Strike com maior Net GEX em valor absoluto."
          />
          <MetricCard
            label="Maior Net GEX"
            value={formatNumber(dominantStrike?.strike)}
            tone={dominantStrike?.net_gex >= 0 ? "positive" : "negative"}
            helper={formatNumber(dominantStrike?.net_gex)}
            tooltip="Strike cuja exposição Net GEX possui a maior magnitude no perfil agregado."
          />
        </section>

        <section
          aria-label="Inteligência institucional V2"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        >
          <MetricCard
            label="Score institucional"
            value={formatNumber(data.dealer_report.institutional_score)}
            tone="accent"
            helper="0 short · 50 neutro · 100 long"
            tooltip="Score direcional educacional calculado a partir de GEX, OI, mudanças, volume e agressor disponível."
          />
          <MetricCard
            label="Intensidade"
            value={data.dealer_report.intensity}
            tone="flip"
            helper={data.gamma_summary.regime_strength}
            tooltip="Intensidade heurística do regime; não garante continuidade do cenário."
          />
          <MetricCard
            label="Risco rompimento"
            value={data.dealer_report.breakout_risk}
            tone="negative"
            helper="Leitura probabilística"
            tooltip="Risco estimado a partir da estrutura do snapshot, sem dados de mercado em tempo real."
          />
          <MetricCard
            label="Risco reversão"
            value={data.dealer_report.reversal_risk}
            tone="positive"
            helper="Leitura probabilística"
            tooltip="Classificação educacional, não uma instrução operacional."
          />
          <MetricCard
            label="Call OI total"
            value={formatCompact(data.open_interest_summary.call_oi_total)}
            tone="positive"
            helper={`Maior strike ${formatNumber(data.open_interest_summary.largest_call_oi_strike)}`}
            tooltip="Open Interest agregado das Calls presentes no CSV analisado."
          />
          <MetricCard
            label="Put OI total"
            value={formatCompact(data.open_interest_summary.put_oi_total)}
            tone="negative"
            helper={`Maior strike ${formatNumber(data.open_interest_summary.largest_put_oi_strike)}`}
            tooltip="Open Interest agregado das Puts; o CSV demonstrativo não representa mercado ao vivo."
          />
        </section>

        {openInterest ? (
          <section
            id="open-interest"
            className="scroll-mt-4 grid gap-3 xl:grid-cols-[440px_minmax(0,1fr)]"
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Open Interest total"
                value={formatCompact(openInterest.total_oi)}
                tone="accent"
                helper="Calls + Puts"
                tooltip="Soma de todo o Open Interest válido presente no snapshot."
              />
              <MetricCard
                label="Net OI"
                value={formatCompact(openInterest.net_oi)}
                tone={openInterest.net_oi >= 0 ? "positive" : "negative"}
                helper="Call OI − Put OI"
                tooltip="Diferença estrutural entre o Open Interest de Calls e Puts."
              />
              <MetricCard
                label="Maior concentração"
                value={formatNumber(openInterest.largest_concentration_strike)}
                tone="flip"
                helper={formatPercent(openInterest.largest_concentration_pct)}
                tooltip="Strike com a maior participação percentual no Open Interest total."
              />
              <MetricCard
                label="OI Concentration Score"
                value={formatNumber(openInterest.oi_concentration_score)}
                tone="accent"
                helper="Índice HHI · 0 a 100"
                tooltip="Score HHI: valores maiores indicam Open Interest mais concentrado em poucos strikes."
              />
            </div>
            <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Distribuição de Open Interest</p>
                  <p className="mt-1 text-xs text-terminal-muted">
                    Top 10 strikes por OI total
                  </p>
                </div>
                <LearnButton indicatorLabel="Open Interest total" showLabel />
              </div>
              <OpenInterestDistribution analysis={openInterest} />
            </article>
          </section>
        ) : null}

        <section aria-label="Volatilidade implícita" className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              label="IV ponderada"
              value={formatPercent(volatility?.volatility_summary.weighted_iv)}
              tone="accent"
              helper="Ponderada por Open Interest"
              tooltip="Média da IV válida ponderada pelo Open Interest do arquivo analisado."
            />
            <MetricCard
              label="Call IV"
              value={formatPercent(volatility?.volatility_summary.call_iv)}
              tone="positive"
              helper="Média das Calls"
              tooltip="Média aritmética das volatilidades implícitas válidas de Calls."
            />
            <MetricCard
              label="Put IV"
              value={formatPercent(volatility?.volatility_summary.put_iv)}
              tone="negative"
              helper="Média das Puts"
              tooltip="Média aritmética das volatilidades implícitas válidas de Puts."
            />
            <MetricCard
              label="IV Skew"
              value={
                volatility?.volatility_summary.iv_skew == null
                  ? "—"
                  : `${formatNumber(volatility.volatility_summary.iv_skew)} p.p.`
              }
              tone="flip"
              helper={
                volatility?.volatility_summary.skew_classification ?? "—"
              }
              tooltip="Diferença Put IV menos Call IV. A classificação só existe quando ambos os lados possuem IV válida."
            />
            <MetricCard
              label="Expected Move"
              value={
                volatility?.expected_move.available
                  ? `± ${formatNumber(volatility.expected_move.expected_move_points)}`
                  : volatility
                    ? "Indisponível"
                    : "—"
              }
              tone={volatility?.expected_move.available ? "accent" : "neutral"}
              helper={
                volatility?.expected_move.available
                  ? `${formatPercent(volatility.expected_move.expected_move_pct)} · ${volatility.expected_move.expiry ?? "sem vencimento"}`
                  : volatility?.expected_move.reason ?? "—"
              }
              tooltip="Calculado apenas quando spot, IV e prazo válidos existem no arquivo."
            />
          </div>
          <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Volatility Smile</p>
                <p className="mt-1 text-xs text-terminal-muted">
                  IV por strike, sem preço ou histórico inventados
                </p>
              </div>
              <LearnButton indicatorLabel="Volatility Smile" showLabel />
            </div>
            <VolatilitySmile rows={volatility?.volatility_curve ?? []} />
            <p className="mt-3 rounded-md border border-terminal-accent/20 bg-terminal-accent/5 px-3 py-2 text-[10px] leading-4 text-terminal-muted">
              IV calculada a partir do arquivo analisado. IV Rank e IV
              Percentile exigem histórico e ainda não estão disponíveis.
            </p>
          </article>
        </section>

        {gammaExposure ? (
          <section className="grid gap-3 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Call GEX"
                value={formatCompact(gammaExposure.call_gex)}
                tone="positive"
                helper={`Pico ${formatNumber(gammaExposure.largest_positive_gex_strike)}`}
                tooltip="Gamma Exposure agregado das Calls: gamma × Open Interest × multiplicador contratual."
              />
              <MetricCard
                label="Put GEX"
                value={formatCompact(gammaExposure.put_gex)}
                tone="negative"
                helper={`Pico ${formatNumber(gammaExposure.largest_negative_gex_strike)}`}
                tooltip="Gamma Exposure agregado das Puts com sinal negativo pela convenção institucional."
              />
              <MetricCard
                label="GEX bruto"
                value={formatCompact(gammaExposure.total_gex)}
                tone="accent"
                helper="|Call GEX| + |Put GEX|"
                tooltip="Exposição absoluta total, sem compensação entre Calls e Puts."
              />
              <MetricCard
                label="Dealer Pressure"
                value={gammaExposure.dealer_pressure}
                tone={
                  gammaExposure.dealer_pressure === "SUPPRESSIVE"
                    ? "positive"
                    : gammaExposure.dealer_pressure === "AMPLIFYING"
                      ? "negative"
                      : "flip"
                }
                helper={`${formatNumber(gammaExposure.dealer_pressure_score)} / 100`}
                tooltip="Pressão normalizada pelo GEX bruto. Positiva tende a suprimir movimentos; negativa tende a amplificá-los."
              />
            </div>
            <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Curva de Gamma</p>
                  <p className="mt-1 text-xs text-terminal-muted">
                    Net GEX por strike · gamma {gammaExposure.gamma_source}
                  </p>
                </div>
                <LearnButton indicatorLabel="GEX Total" showLabel />
              </div>
              <GammaCurve
                rows={gammaExposure.curve_by_strike}
                gammaFlip={gammaExposure.gamma_flip}
                gammaMagnet={gammaExposure.gamma_magnet}
              />
            </article>
          </section>
        ) : null}

        <div id="dealer" className="scroll-mt-4">
          <InstitutionalReport data={data} />
        </div>

        <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Perfil Net GEX</p>
                <p className="mt-1 text-xs text-terminal-muted">Exposição bilateral por strike</p>
              </div>
              <LearnButton indicatorLabel="GEX Total" showLabel />
            </div>
            <GexProfile rows={data.gex_by_strike} levels={levels} />
          </article>
          <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Mapa GEX</p>
                <p className="mt-1 text-xs text-terminal-muted">
                  Concentração e pressão por strike
                </p>
              </div>
              <LearnButton indicatorLabel="Dealer Pressure" showLabel />
            </div>
            <GexMap
              rows={gammaExposure?.curve_by_strike ?? data.gex_by_strike}
              levels={levels}
            />
          </article>
        </section>

        <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
            <div className="mb-3">
              <div className="flex items-start justify-between gap-2 border-b border-terminal-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Tabela por strike</p>
                  <p className="mt-1 text-xs text-terminal-muted">Dados agregados do snapshot</p>
                </div>
                <LearnButton indicatorLabel="Strikes" showLabel />
              </div>
            </div>
            <div className="px-2 pb-2">
              <StrikeTable rows={data.strike_table} levels={levels} />
            </div>
          </article>
          <AlertPanel alerts={alerts} />
        </section>
      </div>
    </>
  );
}
