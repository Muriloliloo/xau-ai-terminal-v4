"use client";

import Link from "next/link";

import { MetricCard } from "@/components/cards/MetricCard";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { OpenInterestDistribution } from "@/components/charts/OpenInterestDistribution";
import { createCmeInstitutionalSnapshot, setInstitutionalMode } from "@/lib/api";
import {
  clearCmeBulletinSession,
  cmeOpenInterestForChart,
  type CmeBulletinDashboardData,
} from "@/lib/cmeBulletin";
import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "@/lib/formatters";
import type { InstitutionalDataState, MarketSpotResponse } from "@/types";
import { useState } from "react";

interface CmeBulletinDashboardProps {
  data: CmeBulletinDashboardData;
  apiConnected: boolean;
  loading: boolean;
  onRefresh: () => void;
  onCleared: () => void;
  spot: MarketSpotResponse | null;
  institutionalState: InstitutionalDataState | null;
}

function UnavailablePanel({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-terminal-text">{title}</p>
          <p className="mt-2 text-xs leading-5 text-terminal-muted">{reason}</p>
        </div>
        <StatusBadge label="Indisponível" tone="negative" />
      </div>
    </article>
  );
}

export function CmeBulletinDashboard({
  data,
  apiConnected,
  loading,
  onRefresh,
  onCleared,
  spot,
  institutionalState,
}: CmeBulletinDashboardProps) {
  const [snapshotId, setSnapshotId] = useState<number | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const oi = data.open_interest_analysis;
  const chart = cmeOpenInterestForChart(data);

  async function clearMode() {
    await setInstitutionalMode("demo");
    clearCmeBulletinSession();
    onCleared();
  }

  async function saveSnapshot() {
    setSnapshotBusy(true);
    try {
      const snapshot = await createCmeInstitutionalSnapshot();
      setSnapshotId(snapshot.id);
    } finally {
      setSnapshotBusy(false);
    }
  }

  return (
    <>
      <header className="mb-3 rounded-lg border border-terminal-border bg-terminal-card px-3.5 py-3 shadow-[0_10px_28px_rgb(0_0_0/14%)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-[0.08em]">
                GOLD OPTIONS · CME
              </h1>
              <StatusBadge label="CME EOD" tone="warning" />
              <StatusBadge label="Dados de fechamento" tone="warning" />
              <StatusBadge label="Importação manual" tone="neutral" />
              <StatusBadge label="Análise parcial" tone="warning" />
              <StatusBadge label="Sem fallback demo" tone="positive" />
            </div>
            <p className="mt-2 text-xs text-terminal-muted">
              Boletim {data.metadata.bulletin_date ?? "sem data"} · importado em{" "}
              {formatTimestamp(data.imported_at)}
            </p>
            <p className="mt-1 text-[11px] text-terminal-muted">
              Spot separado: {spot?.data?.price != null ? formatNumber(spot.data.price) : "Indisponível"}
              {spot?.metadata?.provider ? ` · ${spot.metadata.provider} · ${spot.metadata.freshness_type}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={apiConnected ? "API conectada" : "API indisponível"}
              tone={apiConnected ? "positive" : "negative"}
            />
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent disabled:opacity-40"
            >
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => void clearMode()}
              className="rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-xs font-semibold text-terminal-muted"
            >
              Sair do modo CME
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <section
          aria-label="Metadados CME"
          className="grid grid-cols-2 gap-3 xl:grid-cols-5"
        >
          <MetricCard
            label="Contratos"
            value={formatNumber(data.contract_count)}
            tone="accent"
            helper={`${formatNumber(data.report.calls_found)} Calls · ${formatNumber(data.report.puts_found)} Puts`}
            tooltip="Contratos de opções de ouro reconhecidos no boletim CME importado."
          />
          <MetricCard
            label="Call OI"
            value={formatCompact(oi?.call_oi_total)}
            tone="positive"
            helper={`Wall ${formatNumber(oi?.largest_call_oi_strike)}`}
          />
          <MetricCard
            label="Put OI"
            value={formatCompact(oi?.put_oi_total)}
            tone="negative"
            helper={`Wall ${formatNumber(oi?.largest_put_oi_strike)}`}
          />
          <MetricCard
            label="Net OI"
            value={formatCompact(oi?.net_oi)}
            tone={(oi?.net_oi ?? 0) >= 0 ? "positive" : "negative"}
            helper="Call OI menos Put OI"
          />
          <MetricCard
            label="Concentração OI"
            value={formatPercent(oi?.largest_concentration_pct)}
            tone="flip"
            helper={`Strike ${formatNumber(oi?.largest_concentration_strike)}`}
          />
          <MetricCard
            label="Put/Call OI Ratio"
            value={formatNumber(oi?.put_call_oi_ratio)}
            tone="flip"
            helper="Put OI ÷ Call OI"
          />
          <MetricCard
            label="Volume total"
            value={formatCompact(oi?.volume_total)}
            tone="accent"
            helper={`${formatCompact(oi?.call_volume_total)} Calls · ${formatCompact(oi?.put_volume_total)} Puts`}
          />
          <MetricCard
            label="Vencimentos"
            value={formatNumber(oi?.expiration_count ?? data.report.expirations_found.length)}
            tone="accent"
            helper={`Boletim ${data.metadata.bulletin_date ?? "—"}`}
          />
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <article
            id="open-interest"
            className="scroll-mt-4 rounded-lg border border-terminal-border bg-terminal-card p-4"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Distribuição de Open Interest</p>
                <p className="mt-1 text-xs text-terminal-muted">
                  Top 10 strikes do boletim de fechamento · sem valores
                  demonstrativos
                </p>
              </div>
              <StatusBadge label="OI disponível" tone="positive" />
            </div>
            {chart ? (
              <OpenInterestDistribution analysis={chart} />
            ) : (
              <p className="py-12 text-center text-sm text-terminal-muted">
                Não há Open Interest suficiente.
              </p>
            )}
          </article>

          <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Qualidade e origem</p>
              <StatusBadge
                label={data.report.status.replaceAll("_", " ")}
                tone="warning"
              />
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-terminal-muted">Provider</dt>
                <dd className="mt-1 font-mono text-terminal-text">
                  cme_bulletin
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Fonte</dt>
                <dd className="mt-1 text-terminal-text">{data.metadata.source}</dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Elegibilidade</dt>
                <dd className="mt-1 font-mono text-terminal-text">
                  {data.eligibility.status}
                </dd>
              </div>
              <div>
                <dt className="text-terminal-muted">Campos ausentes</dt>
                <dd className="mt-1 text-terminal-text">
                  {data.metadata.missing_fields.join(", ") || "Nenhum"}
                </dd>
              </div>
            </dl>
            {data.metadata.warnings.length ? (
              <ul className="mt-4 max-h-36 space-y-1 overflow-auto border-t border-terminal-border pt-3 text-[11px] leading-4 text-terminal-flip">
                {data.metadata.warnings.slice(0, 8).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <UnavailablePanel
            title="Gamma Environment"
            reason="O boletim não fornece Gamma por contrato; nenhum regime de Gamma foi inferido."
          />
          <UnavailablePanel
            title="Call Wall"
            reason="Wall de Gamma exige Gamma por contrato e não é equivalente ao maior OI de Call."
          />
          <UnavailablePanel
            title="Put Wall"
            reason="Wall de Gamma exige Gamma por contrato e não é equivalente ao maior OI de Put."
          />
          <UnavailablePanel
            title="Gamma Flip / GEX"
            reason="Gamma Flip e GEX permanecem indisponíveis; Open Interest não é convertido em Gamma."
          />
          <UnavailablePanel
            title="Dealer Bias / Regime"
            reason="Dealer Bias, Market Regime e Confidence baseados em Gamma não podem ser calculados a partir deste boletim."
          />
          <UnavailablePanel
            title="Volatilidade implícita"
            reason="O boletim analisado não fornece IV. IV Rank, IV Percentile e Expected Move permanecem indisponíveis."
          />
          <UnavailablePanel
            title="Preço spot"
            reason="Nenhum spot compatível foi informado. Dados de datas diferentes não são combinados silenciosamente."
          />
          <article className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Snapshot CME</p>
                <p className="mt-2 text-xs leading-5 text-terminal-muted">
                  Persiste OI, volume, metadata e limitações sem inserir Gamma ou GEX demonstrativo.
                </p>
              </div>
              <button type="button" onClick={() => void saveSnapshot()} disabled={snapshotBusy} className="rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-2 py-1.5 text-xs font-semibold text-terminal-accent disabled:opacity-40">
                {snapshotBusy ? "Salvando…" : "Salvar Snapshot"}
              </button>
            </div>
            {snapshotId ? <p className="mt-3 text-xs text-terminal-positive">Snapshot CME #{snapshotId} salvo.</p> : null}
          </article>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-terminal-border bg-terminal-card p-4">
          <p className="max-w-4xl text-[10px] leading-4 text-terminal-muted">
            Dados derivados de boletim público da CME Group. Uso sujeito aos
            termos e licenças da CME. Não redistribuir o PDF original sem
            autorização.
          </p>
          <Link
            href="/system"
            className="text-xs font-semibold text-terminal-accent hover:underline"
          >
            Importar outro boletim
          </Link>
        </div>
        {institutionalState?.warnings.length ? (
          <section className="rounded-lg border border-terminal-flip/30 bg-terminal-flip/5 p-3 text-xs text-terminal-muted">
            <p className="font-semibold text-terminal-flip">Transparência de fonte</p>
            <ul className="mt-2 space-y-1">
              {institutionalState.warnings.slice(0, 5).map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
