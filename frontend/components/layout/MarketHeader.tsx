import { StatusBadge } from "@/components/cards/StatusBadge";
import { ASSET_SYMBOL } from "@/lib/constants";
import {
  formatNumber,
  formatSignedPercent,
  formatTime,
} from "@/lib/formatters";
import type { AnalysisResponse } from "@/types";

interface MarketHeaderProps {
  data: AnalysisResponse | null;
  apiStatus: "loading" | "connected" | "error";
  loading: boolean;
  onRefresh: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveStatus?: string | null;
}

export function MarketHeader({
  data,
  apiStatus,
  loading,
  onRefresh,
  onSave,
  saving = false,
  saveStatus,
}: MarketHeaderProps) {
  const priceAvailable = data?.price != null;
  const statusLabel = {
    loading: "Conectando à API",
    connected: "API conectada",
    error: "API indisponível",
  }[apiStatus];
  const statusTone = {
    loading: "neutral",
    connected: "positive",
    error: "negative",
  }[apiStatus] as "neutral" | "positive" | "negative";

  return (
    <header className="mb-3 rounded-lg border border-terminal-border bg-terminal-card px-3.5 py-3 shadow-[0_10px_28px_rgb(0_0_0/14%)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-terminal-muted">
              Mercado
            </p>
            <h1 className="mt-0.5 text-base font-semibold tracking-[0.08em]">
              {ASSET_SYMBOL}
            </h1>
          </div>
          <div className="h-8 w-px bg-terminal-border" aria-hidden />
          <div className="min-w-36">
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-terminal-muted">
              Preço atual
            </p>
            <p
              className={`mt-0.5 font-mono text-sm font-semibold ${
                priceAvailable ? "text-terminal-text" : "text-terminal-muted"
              }`}
            >
              {priceAvailable ? formatNumber(data.price) : "Preço indisponível"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-terminal-muted">
              Variação
            </p>
            <p className="mt-0.5 font-mono text-xs text-terminal-muted">
              {formatSignedPercent(data?.price_change_percent)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusBadge
            label={statusLabel}
            tone={statusTone}
          />
          {data?.source_mode === "demo" ? (
            <StatusBadge label="Dados demonstrativos" tone="warning" />
          ) : null}
          {data?.snapshot_id ? (
            <StatusBadge label={`Snapshot #${data.snapshot_id}`} tone="neutral" />
          ) : null}
          <div className="min-w-28">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
              Atualização
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-terminal-text">
              {formatTime(data?.generated_at)}
            </p>
          </div>
          <div className="min-w-32">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
              Origem
            </p>
            <p
              title={data?.source_name ?? "Nenhuma fonte carregada"}
              className="mt-0.5 max-w-40 truncate font-mono text-[11px] text-terminal-text"
            >
              {data?.source_name ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent transition hover:bg-terminal-accent/15 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
          {data && onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              title={saveStatus ?? "Salvar uma cópia manual deste snapshot"}
              className="rounded-md border border-terminal-positive/45 bg-terminal-positive/10 px-3 py-2 text-xs font-semibold text-terminal-positive transition hover:bg-terminal-positive/15 disabled:cursor-wait disabled:opacity-50"
            >
              {saving ? "Salvando…" : saveStatus ?? "Salvar Snapshot"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
