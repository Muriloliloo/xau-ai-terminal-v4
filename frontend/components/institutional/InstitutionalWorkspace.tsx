"use client";

import { type FormEvent, useState } from "react";

import { MetricCard } from "@/components/cards/MetricCard";
import { InstitutionalReport } from "@/components/institutional/InstitutionalReport";
import { Header } from "@/components/layout/Header";
import { StrikeTable } from "@/components/tables/StrikeTable";
import { formatNumber, formatPercent } from "@/lib/formatters";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import type { AnalysisResponse, InstitutionalLevels } from "@/types";

const optionDataProvider = getOptionDataProvider();

export function InstitutionalWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function analyze(source: "demo" | "upload") {
    setStatus("loading");
    setMessage(null);
    try {
      const result =
        source === "demo"
          ? await optionDataProvider.load()
          : file
            ? await optionDataProvider.load({ file })
            : null;
      if (!result) {
        setStatus("error");
        setMessage("Selecione um arquivo CSV antes de enviar.");
        return;
      }
      setData(result);
      setStatus("idle");
    } catch (reason) {
      setStatus("error");
      setMessage(reason instanceof Error ? reason.message : "Erro desconhecido.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void analyze("upload");
  }

  return (
    <>
      <Header
        eyebrow="Entrada validada"
        title="Cérebro institucional"
        description="Envie um CSV ou execute a amostra; ambos usam o mesmo endpoint e os mesmos engines."
        online={status !== "error"}
      />

      <form
        onSubmit={submit}
        className="mb-3 flex flex-col gap-3 rounded-lg border border-terminal-border bg-terminal-card p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="mb-2 block text-xs font-medium text-terminal-muted">
            Arquivo CSV de opções
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-md border border-terminal-border bg-terminal-sidebar px-3 py-2 text-xs text-terminal-muted file:mr-3 file:rounded file:border-0 file:bg-terminal-accent/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-terminal-accent"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-md bg-terminal-accent px-4 py-2 text-sm font-semibold text-terminal-bg disabled:opacity-50"
          >
            Analisar CSV
          </button>
          <button
            type="button"
            disabled={status === "loading"}
            onClick={() => void analyze("demo")}
            className="rounded-md border border-terminal-border px-4 py-2 text-sm text-terminal-text hover:bg-terminal-sidebar disabled:opacity-50"
          >
            Usar amostra
          </button>
        </div>
      </form>

      {status === "loading" ? (
        <div className="loading-shimmer h-64 rounded-lg" />
      ) : message ? (
        <div className="rounded-lg border border-terminal-negative/40 bg-terminal-negative/5 p-4 text-sm text-terminal-negative">
          {message}
        </div>
      ) : !data ? (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-terminal-border bg-terminal-card/40 p-6 text-center">
          <div>
            <p className="text-sm font-semibold">Aguardando uma fonte de dados</p>
            <p className="mt-2 text-xs text-terminal-muted">
              Nenhum valor será exibido até o backend concluir uma análise.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <MetricCard label="Call Wall" value={formatNumber(data.call_wall)} tone="positive" />
            <MetricCard label="Put Wall" value={formatNumber(data.put_wall)} tone="negative" />
            <MetricCard label="Gamma Flip" value={formatNumber(data.gamma_flip)} tone="flip" />
            <MetricCard label="GEX Total" value={formatNumber(data.gex_total)} tone="accent" />
            <MetricCard label="Confiança" value={formatPercent(data.confidence)} />
          </section>
          <InstitutionalReport data={data} />
          <section className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <StrikeTable
              rows={data.strike_table}
              levels={
                {
                  callWall: data.call_wall,
                  putWall: data.put_wall,
                  gammaFlip: data.gamma_flip,
                  gammaMagnet: data.gamma_magnet,
                } satisfies InstitutionalLevels
              }
            />
          </section>
        </div>
      )}
    </>
  );
}
