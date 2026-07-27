"use client";

import Link from "next/link";
import { useState } from "react";

import { CardHeader } from "@/components/cards/CardHeader";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { confirmCmeBulletin, previewCmeBulletin } from "@/lib/api";
import { saveCmeBulletinSession } from "@/lib/cmeBulletin";
import { safeErrorMessage } from "@/lib/errors";
import { formatNumber, formatTimestamp } from "@/lib/formatters";
import type {
  CmeBulletinConfirmResponse,
  CmeBulletinPreview,
} from "@/types";

interface CmeBulletinImportProps {
  onImported: () => void;
}

const LEGAL_NOTICE =
  "Dados derivados de boletim público da CME Group. Uso sujeito aos termos e licenças da CME. Não redistribuir o PDF original sem autorização.";

function InfoValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-panel p-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xs text-terminal-text">{value}</p>
    </div>
  );
}

export function CmeBulletinImport({
  onImported,
}: CmeBulletinImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CmeBulletinPreview | null>(null);
  const [confirmed, setConfirmed] =
    useState<CmeBulletinConfirmResponse | null>(null);
  const [allowReprocess, setAllowReprocess] = useState(false);
  const [busy, setBusy] = useState<"preview" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function runPreview() {
    if (!file) return;
    setBusy("preview");
    setError(null);
    setSuccessMessage(null);
    setPreview(null);
    setConfirmed(null);
    try {
      setPreview(await previewCmeBulletin(file));
    } catch (reason) {
      setError(
        safeErrorMessage(
          reason,
          "Não foi possível interpretar o boletim da CME.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy("confirm");
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await confirmCmeBulletin(
        preview.preview_id,
        allowReprocess,
      );
      setConfirmed(response);
      saveCmeBulletinSession(response.result);
      setSuccessMessage("CME Bulletin importado com sucesso.");
      onImported();
    } catch (reason) {
      setError(
        safeErrorMessage(reason, "Não foi possível confirmar a importação."),
      );
    } finally {
      setBusy(null);
    }
  }

  const canConfirm =
    preview
    && preview.eligibility.status !== "blocked"
    && (!preview.duplicate || allowReprocess);

  return (
    <section className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
      <CardHeader
        title="CME Daily Bulletin"
        description="Importação manual do boletim diário de opções de ouro. Após a confirmação, o provider CME vira a fonte institucional e um snapshot é gerado automaticamente."
        action={<StatusBadge label="CME EOD" tone="warning" />}
      />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Dados de fechamento" tone="warning" />
          <StatusBadge label="Importação manual" tone="neutral" />
          <StatusBadge label="Não intraday" tone="neutral" />
        </div>

        <div className="rounded-md border border-terminal-flip/30 bg-terminal-flip/5 p-3 text-xs leading-5 text-terminal-muted">
          O sistema lê apenas o PDF enviado por você. Não há download automático,
          scraping ou consulta a APIs não documentadas. Campos ausentes permanecem
          indisponíveis.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
            Boletim CME em PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setConfirmed(null);
                setAllowReprocess(false);
                setError(null);
              }}
              className="mt-1.5 block w-full rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-xs normal-case tracking-normal text-terminal-text file:mr-3 file:rounded file:border-0 file:bg-terminal-accent/15 file:px-2 file:py-1 file:text-terminal-accent"
            />
          </label>
          <button
            type="button"
            disabled={!file || busy !== null}
            onClick={() => void runPreview()}
            className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "preview" ? "Processando PDF…" : "Validar e visualizar"}
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-terminal-negative/35 bg-terminal-negative/5 px-3 py-2 text-xs text-terminal-negative">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-terminal-positive/35 bg-terminal-positive/5 px-3 py-2 text-xs text-terminal-positive">
            {successMessage}
          </p>
        ) : null}

        {preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={preview.report.status.replaceAll("_", " ")}
                tone={
                  preview.eligibility.status === "blocked"
                    ? "negative"
                    : preview.report.status === "valid"
                      ? "positive"
                      : "warning"
                }
              />
              <StatusBadge label="Análise parcial" tone="warning" />
              <StatusBadge label="OI disponível" tone="positive" />
              <StatusBadge label="Gamma indisponível" tone="negative" />
              {preview.duplicate ? (
                <StatusBadge label="Arquivo já importado" tone="negative" />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <InfoValue
                label="Data do boletim"
                value={preview.metadata.bulletin_date ?? "—"}
              />
              <InfoValue
                label="Contratos válidos"
                value={formatNumber(preview.report.valid_contracts)}
              />
              <InfoValue
                label="Calls / Puts"
                value={`${formatNumber(preview.report.calls_found)} / ${formatNumber(preview.report.puts_found)}`}
              />
              <InfoValue
                label="Vencimentos"
                value={formatNumber(preview.report.expirations_found.length)}
              />
              <InfoValue
                label="Páginas processadas"
                value={`${preview.report.pages_processed}/${preview.report.pages_total}`}
              />
            </div>

            <div className="rounded-md border border-terminal-border bg-terminal-panel p-3 text-xs">
              <p className="font-semibold text-terminal-text">
                Elegibilidade: {preview.eligibility.status.replaceAll("_", " ")}
              </p>
              <p className="mt-1 leading-5 text-terminal-muted">
                {preview.eligibility.reason}
              </p>
              <p className="mt-1 leading-5 text-terminal-muted">
                Engines compatíveis: {preview.eligibility.engines_allowed.join(", ") || "Nenhum"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-terminal-muted">
                Prévia expira em {formatTimestamp(preview.expires_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-terminal-border bg-terminal-panel p-3 text-xs">
                <p className="font-semibold text-terminal-text">Campos ausentes</p>
                <p className="mt-1 leading-5 text-terminal-muted">
                  {preview.metadata.missing_fields.join(", ") || "Nenhum campo ausente reportado."}
                </p>
              </div>
              <div className="rounded-md border border-terminal-border bg-terminal-panel p-3 text-xs">
                <p className="font-semibold text-terminal-text">Alinhamento com spot</p>
                <p className="mt-1 font-mono text-terminal-text">
                  {preview.spot_alignment.status}
                </p>
                {preview.spot_alignment.warning ? (
                  <p className="mt-1 leading-5 text-terminal-muted">
                    {preview.spot_alignment.warning}
                  </p>
                ) : null}
              </div>
            </div>

            {preview.report.warnings.length ? (
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-terminal-flip/30 bg-terminal-flip/5 p-3 text-xs text-terminal-flip">
                {preview.report.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}

            {preview.report.blocking_errors.length ? (
              <ul className="space-y-1 rounded-md border border-terminal-negative/30 bg-terminal-negative/5 p-3 text-xs text-terminal-negative">
                {preview.report.blocking_errors.map((message) => (
                  <li key={message}>• {message}</li>
                ))}
              </ul>
            ) : null}

            {preview.sample_contracts.length ? (
              <div className="max-h-72 overflow-auto rounded-md border border-terminal-border">
                <table className="min-w-[980px] w-full text-left font-mono text-[10px]">
                  <thead className="sticky top-0 bg-terminal-panel text-terminal-muted">
                    <tr>
                      <th className="px-2 py-2">Produto</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Mês</th>
                      <th className="px-2 py-2">Vencimento</th>
                      <th className="px-2 py-2">Strike</th>
                      <th className="px-2 py-2">Settlement</th>
                      <th className="px-2 py-2">Volume</th>
                      <th className="px-2 py-2">OI</th>
                      <th className="px-2 py-2">Delta</th>
                      <th className="px-2 py-2">Página</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_contracts.map((contract, index) => (
                      <tr
                        key={`${contract.product_code}-${contract.option_type}-${contract.contract_month}-${contract.strike}-${index}`}
                        className="border-t border-terminal-border/70"
                      >
                        <td className="px-2 py-2">{contract.product_code}</td>
                        <td className="px-2 py-2">{contract.option_type}</td>
                        <td className="px-2 py-2">{contract.contract_month}</td>
                        <td className="px-2 py-2">{contract.expiration ?? "—"}</td>
                        <td className="px-2 py-2">{formatNumber(contract.strike)}</td>
                        <td className="px-2 py-2">{formatNumber(contract.settlement)}</td>
                        <td className="px-2 py-2">{formatNumber(contract.volume)}</td>
                        <td className="px-2 py-2">{formatNumber(contract.open_interest)}</td>
                        <td className="px-2 py-2">{formatNumber(contract.delta)}</td>
                        <td className="px-2 py-2">{contract.source_page}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {preview.duplicate ? (
              <label className="flex items-start gap-2 rounded-md border border-terminal-negative/30 bg-terminal-negative/5 p-3 text-xs text-terminal-muted">
                <input
                  type="checkbox"
                  checked={allowReprocess}
                  onChange={(event) => setAllowReprocess(event.target.checked)}
                  className="mt-0.5 accent-red-500"
                />
                <span>
                  Confirmo o reprocessamento explícito do mesmo SHA-256
                  {preview.duplicate_import_id
                    ? ` (importação #${preview.duplicate_import_id})`
                    : ""}
                  .
                </span>
              </label>
            ) : null}

            {!confirmed ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-terminal-positive/30 bg-terminal-positive/5 p-3">
                <p className="max-w-3xl text-xs leading-5 text-terminal-muted">
                  A confirmação persiste contratos e metadados e executa somente
                  os engines liberados pela elegibilidade ({preview.eligibility.engines_allowed.join(", ") || "nenhum"}).
                  Campos sem dados permanecem indisponíveis; o boletim não é
                  completado silenciosamente com dados demonstrativos.
                </p>
                <button
                  type="button"
                  disabled={!canConfirm || busy !== null}
                  onClick={() => void confirmImport()}
                  className="rounded-md border border-terminal-positive/45 bg-terminal-positive/10 px-3 py-2 text-xs font-semibold text-terminal-positive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "confirm" ? "Confirmando…" : "Confirmar importação"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-terminal-positive/35 bg-terminal-positive/5 p-3">
                <div>
                  <p className="text-sm font-semibold text-terminal-positive">
                    Importação #{confirmed.result.id} confirmada
                  </p>
                  <p className="mt-1 text-xs text-terminal-muted">
                    {formatNumber(confirmed.result.contract_count)} contratos ·
                    dashboard atualizado sem dados demonstrativos.
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-md border border-terminal-accent/45 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent"
                >
                  Abrir Dashboard
                </Link>
              </div>
            )}
          </div>
        ) : null}

        <p className="border-t border-terminal-border pt-3 text-[10px] leading-4 text-terminal-muted">
          {LEGAL_NOTICE}
        </p>
      </div>
    </section>
  );
}
