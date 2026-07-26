"use client";

import { useCallback, useState } from "react";

import { CardHeader } from "@/components/cards/CardHeader";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { Header } from "@/components/layout/Header";
import { ManualOptionsImport } from "@/components/workspace/ManualOptionsImport";
import { getHealth, getProvidersStatus } from "@/lib/api";
import { formatTimestamp, UNAVAILABLE_LABEL } from "@/lib/formatters";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { useRemoteResource } from "@/lib/useRemoteResource";
import type { ProviderMetadata } from "@/lib/providers/interfaceProvider";

const provider = getOptionDataProvider();

function readProviderMetadata(): ProviderMetadata {
  return provider.getMetadata();
}

function formatDuration(value: number | null): string {
  return value == null ? UNAVAILABLE_LABEL : `${value.toFixed(2)} ms`;
}

function SystemValue({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-panel p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-sm text-terminal-text">
        {value}
      </p>
    </div>
  );
}

export function SystemWorkspace() {
  const { data: health, error, loading, reload } = useRemoteResource(getHealth);
  const {
    data: providerStatus,
    error: providerError,
    loading: providerLoading,
    reload: reloadProviders,
  } = useRemoteResource(getProvidersStatus);
  const [metadata, setMetadata] = useState(readProviderMetadata);

  const refreshPanel = useCallback(async () => {
    await Promise.all([reload(), reloadProviders()]);
    setMetadata(readProviderMetadata());
  }, [reload, reloadProviders]);

  const providerTone =
    metadata.status === "ready"
      ? "positive"
      : metadata.status === "error" || metadata.status === "unavailable"
        ? "negative"
        : "warning";

  return (
    <>
      <Header
        eyebrow="Runtime local"
        title="Painel do Sistema"
        description="Telemetria do provider ativo e estado de comunicação da API, sem alterar a execução dos engines."
        online={Boolean(health) && !error}
      />

      <section className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
        <CardHeader
          title="Data Provider"
          description="Métricas da última leitura realizada nesta sessão do navegador."
          action={
            <button
              type="button"
              onClick={() => void refreshPanel()}
              disabled={loading}
              className="rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent disabled:opacity-50"
            >
              {loading ? "Verificando…" : "Atualizar painel"}
            </button>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SystemValue label="Provider" value={metadata.name} />
          <SystemValue label="Versão" value={metadata.version} />
          <SystemValue label="Tipo" value={metadata.type.toUpperCase()} />
          <div className="rounded-md border border-terminal-border bg-terminal-panel p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
              Status
            </p>
            <StatusBadge label={metadata.status} tone={providerTone} />
          </div>
          <SystemValue
            label="Tempo de leitura"
            value={formatDuration(metadata.readDurationMs)}
          />
          <SystemValue label="Quantidade de strikes" value={metadata.strikeCount} />
          <SystemValue label="Quantidade de opções" value={metadata.optionCount} />
          <SystemValue
            label="Último refresh"
            value={
              metadata.lastRefreshAt
                ? formatTimestamp(metadata.lastRefreshAt)
                : UNAVAILABLE_LABEL
            }
          />
          <SystemValue label="Origem" value={metadata.origin} />
          <SystemValue
            label="Fallback utilizado"
            value={metadata.fallbackUsed ? "Sim · CSV" : "Não"}
          />
          <SystemValue
            label="Health"
            value={
              health
                ? `${health.status.toUpperCase()} · ${health.name} ${health.version}`
                : error
                  ? "API indisponível"
                  : "Verificando"
            }
          />
          <SystemValue
            label="Disponibilidade"
            value={error ? "Offline" : health ? "Online" : "Pendente"}
          />
        </div>
      </section>

      <section className="workspace-fade mt-3 overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
        <CardHeader
          title="Fontes de Dados"
          description="Configuração efetiva do backend. Chaves permanecem no servidor e nunca são exibidas."
        />
        <div className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SystemValue
              label="Provider selecionado"
              value={providerStatus?.selected_provider ?? UNAVAILABLE_LABEL}
            />
            <SystemValue
              label="Fallback demonstrativo"
              value={
                providerStatus
                  ? providerStatus.fallback_enabled
                    ? "Habilitado"
                    : "Desabilitado"
                  : UNAVAILABLE_LABEL
              }
            />
            <SystemValue
              label="Status da consulta"
              value={
                providerError
                  ? "API indisponível"
                  : providerLoading
                    ? "Carregando"
                    : "Disponível"
              }
            />
          </div>

          {providerStatus ? (
            <div className="overflow-x-auto rounded-md border border-terminal-border">
              <table className="min-w-[1180px] w-full text-left text-xs">
                <thead className="bg-terminal-panel text-terminal-muted">
                  <tr>
                    <th className="px-3 py-2.5">Provider</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Atualidade</th>
                    <th className="px-3 py-2.5">Chave</th>
                    <th className="px-3 py-2.5">Capacidades</th>
                    <th className="px-3 py-2.5">Último sucesso</th>
                    <th className="px-3 py-2.5">Cache</th>
                    <th className="px-3 py-2.5">Limite conhecido</th>
                    <th className="px-3 py-2.5">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {providerStatus.providers.map((item) => (
                    <tr
                      key={item.provider}
                      className="border-t border-terminal-border/70"
                    >
                      <td className="px-3 py-2.5 font-mono text-terminal-text">
                        {item.provider}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={item.status}
                          tone={
                            item.status === "ready"
                              ? "positive"
                              : item.status === "error"
                                ? "negative"
                                : "warning"
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        {item.freshness_type}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.api_key_configured ? "Configurada" : "Não aplicável/ausente"}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.capabilities.join(", ") || UNAVAILABLE_LABEL}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        {formatTimestamp(item.last_success)}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        {item.cache_ttl_seconds == null
                          ? "Não aplicável"
                          : `TTL ${item.cache_ttl_seconds}s`}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.known_limit ?? UNAVAILABLE_LABEL}
                      </td>
                      <td className="max-w-72 px-3 py-2.5 text-terminal-muted">
                        {item.last_error
                          ?? item.warnings[0]
                          ?? "Sem alertas registrados."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-3">
        <ManualOptionsImport onImported={() => void refreshPanel()} />
      </div>
    </>
  );
}
