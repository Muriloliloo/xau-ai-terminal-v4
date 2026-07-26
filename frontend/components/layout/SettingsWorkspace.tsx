"use client";

import { StatusBadge } from "@/components/cards/StatusBadge";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { Header } from "@/components/layout/Header";
import { API_BASE_URL } from "@/lib/constants";
import { getSettings } from "@/lib/api";
import { useRemoteResource } from "@/lib/useRemoteResource";

export function SettingsWorkspace() {
  const { data: settings, error, reload } = useRemoteResource(getSettings);

  if (error) return <ErrorState message={error} onRetry={() => void reload()} />;

  return (
    <>
      <Header
        eyebrow="Runtime"
        title="Configurações"
        description="Estado somente leitura informado diretamente pelo backend."
        online={Boolean(settings)}
      />
      {!settings ? (
        <div className="loading-shimmer h-56 rounded-lg" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Sistema", settings.name],
            ["Versão", settings.version],
            ["API", API_BASE_URL],
            ["Histórico", settings.history_mode],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-terminal-border bg-terminal-card p-4"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
                {label}
              </p>
              <p className="mt-2 break-all font-mono text-sm text-terminal-text">{value}</p>
            </div>
          ))}
          <div className="rounded-lg border border-terminal-border bg-terminal-card p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.12em] text-terminal-muted">
              Capacidades
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={settings.sample_csv_available ? "CSV disponível" : "CSV ausente"}
                tone={settings.sample_csv_available ? "positive" : "negative"}
              />
              <StatusBadge
                label={settings.scheduler_enabled ? "Scheduler ativo" : "Scheduler inativo"}
              />
              <StatusBadge
                label={
                  settings.realtime_data_enabled
                    ? "Tempo real ativo"
                    : "Tempo real desativado"
                }
              />
            </div>
          </div>
          {!settings.sample_csv_available ? (
            <div className="md:col-span-2">
              <EmptyState
                icon="CSV"
                title="Arquivo CSV demonstrativo ausente"
                description="O Dashboard continuará protegido contra valores inventados. Restaure o arquivo demonstrativo para habilitar a análise local."
              />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
