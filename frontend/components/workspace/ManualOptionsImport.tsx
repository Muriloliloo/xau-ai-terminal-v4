"use client";

import { useState } from "react";

import { CardHeader } from "@/components/cards/CardHeader";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { importManualOptions } from "@/lib/api";
import { safeErrorMessage } from "@/lib/errors";
import { saveManualAnalysis } from "@/lib/providers/manualOptionsProvider";
import type { ManualImportResponse } from "@/types";

interface ManualOptionsImportProps {
  onImported: () => void;
}

export function ManualOptionsImport({
  onImported,
}: ManualOptionsImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ManualImportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(confirm: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const response = await importManualOptions(file, confirm);
      setResult(response);
      if (response.imported && response.analysis) {
        saveManualAnalysis(response.analysis);
        onImported();
      }
    } catch (reason) {
      setError(
        safeErrorMessage(reason, "Não foi possível validar o arquivo."),
      );
    } finally {
      setBusy(false);
    }
  }

  const previewColumns = result?.report.preview[0]
    ? Object.keys(result.report.preview[0])
    : [];

  return (
    <section className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
      <CardHeader
        title="Importação manual de opções"
        description="Valide a cadeia, confira a prévia e confirme explicitamente antes de atualizar o provider e salvar um snapshot."
      />
      <div className="space-y-4 p-4">
        <div className="rounded-md border border-terminal-border bg-terminal-panel p-3 text-xs text-terminal-muted">
          Obrigatórias: <span className="font-mono text-terminal-text">strike, option_type, open_interest, volume</span>.
          Campos como IV, gamma, vencimento, spot e timestamp são opcionais e nunca são inventados.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
            Arquivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
              className="mt-1.5 block w-full rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-xs normal-case tracking-normal text-terminal-text file:mr-3 file:rounded file:border-0 file:bg-terminal-accent/15 file:px-2 file:py-1 file:text-terminal-accent"
            />
          </label>
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => void submit(false)}
            className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Validando…" : "Validar e visualizar"}
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-terminal-negative/35 bg-terminal-negative/5 px-3 py-2 text-xs text-terminal-negative">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={result.report.can_import ? "Arquivo válido" : "Arquivo inválido"}
                tone={result.report.can_import ? "positive" : "negative"}
              />
              <span className="font-mono text-[11px] text-terminal-muted">
                {result.report.valid_rows}/{result.report.total_rows} linhas válidas
              </span>
              {result.imported ? (
                <StatusBadge label="Importação confirmada" tone="positive" />
              ) : null}
            </div>

            {result.report.issues.length ? (
              <ul className="space-y-1 rounded-md border border-terminal-negative/30 bg-terminal-negative/5 p-3 text-xs text-terminal-negative">
                {result.report.issues.slice(0, 10).map((issue, index) => (
                  <li key={`${issue.row}-${issue.field}-${index}`}>
                    Linha {issue.row || "—"} · {issue.field}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {result.report.warnings.length ? (
              <ul className="space-y-1 rounded-md border border-terminal-flip/30 bg-terminal-flip/5 p-3 text-xs text-terminal-flip">
                {result.report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            {result.report.preview.length ? (
              <div className="max-h-72 overflow-auto rounded-md border border-terminal-border">
                <table className="min-w-full text-left font-mono text-[10px]">
                  <thead className="sticky top-0 bg-terminal-panel text-terminal-muted">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column} className="whitespace-nowrap px-2 py-2">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.report.preview.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-t border-terminal-border/70"
                      >
                        {previewColumns.map((column) => (
                          <td key={column} className="whitespace-nowrap px-2 py-2">
                            {row[column] == null ? "—" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {result.report.can_import && !result.imported ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-terminal-positive/30 bg-terminal-positive/5 p-3">
                <p className="text-xs text-terminal-muted">
                  A confirmação executa os engines e cria o snapshot automático.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(true)}
                  className="rounded-md border border-terminal-positive/45 bg-terminal-positive/10 px-3 py-2 text-xs font-semibold text-terminal-positive disabled:opacity-40"
                >
                  {busy ? "Importando…" : "Confirmar importação"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
