"use client";

import { useState } from "react";

import { CardHeader } from "@/components/cards/CardHeader";
import { Header } from "@/components/layout/Header";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  useWorkspace,
} from "@/components/workspace/WorkspaceProvider";
import type {
  WorkspaceMode,
  WorkspacePreferences,
  WorkspaceTheme,
} from "@/types/workspace";

function TogglePreference({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-terminal-border bg-terminal-panel p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-terminal-muted">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-terminal-accent"
      />
    </label>
  );
}

export function PreferencesWorkspace() {
  const { preferences, resetPreferences, updatePreferences } = useWorkspace();
  const [savedMessage, setSavedMessage] = useState(
    "Alterações salvas automaticamente neste navegador.",
  );

  function update<K extends keyof WorkspacePreferences>(
    key: K,
    value: WorkspacePreferences[K],
  ) {
    updatePreferences({ [key]: value });
    setSavedMessage("Preferências atualizadas no LocalStorage.");
  }

  const modes: Array<{ value: WorkspaceMode; label: string }> = [
    { value: "compact", label: "Compacto" },
    { value: "normal", label: "Normal" },
    { value: "expanded", label: "Expandido" },
  ];

  return (
    <>
      <Header
        eyebrow="Experiência local"
        title="Preferences"
        description="Personalize o workspace sem alterar dados, engines ou regras institucionais."
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
          <CardHeader
            title="Aparência"
            description="Tema, densidade e movimento da interface."
          />
          <div className="space-y-3 p-4">
            <label className="block rounded-md border border-terminal-border bg-terminal-panel p-3">
              <span className="text-sm font-medium">Tema</span>
              <select
                value={preferences.theme}
                onChange={(event) =>
                  update("theme", event.target.value as WorkspaceTheme)
                }
                className="mt-2 w-full rounded-md border border-terminal-border bg-terminal-bg px-3 py-2 text-xs"
              >
                <option value="terminal">Terminal institucional</option>
                <option value="obsidian">Obsidian alto contraste</option>
              </select>
            </label>
            <TogglePreference
              label="Animações"
              description="Ativa transições suaves de até 200 ms."
              checked={preferences.animations}
              onChange={(checked) => update("animations", checked)}
            />
            <TogglePreference
              label="Compact Mode"
              description="Reduz espaços entre cards e seções para notebooks."
              checked={preferences.compactMode}
              onChange={(checked) => update("compactMode", checked)}
            />
          </div>
        </section>

        <section className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
          <CardHeader
            title="Comportamento"
            description="Preferências funcionais do dashboard."
          />
          <div className="space-y-3 p-4">
            <TogglePreference
              label="Auto Refresh"
              description="Atualiza o Dashboard automaticamente a cada 60 segundos."
              checked={preferences.autoRefresh}
              onChange={(checked) => update("autoRefresh", checked)}
            />
            <TogglePreference
              label="Mostrar tooltips"
              description="Exibe ajuda contextual nos indicadores."
              checked={preferences.showTooltips}
              onChange={(checked) => update("showTooltips", checked)}
            />
            <TogglePreference
              label="Mostrar valores detalhados"
              description="Exibe as linhas auxiliares abaixo dos valores principais."
              checked={preferences.showDetailedValues}
              onChange={(checked) => update("showDetailedValues", checked)}
            />
          </div>
        </section>
      </div>

      <section className="workspace-fade mt-3 overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
        <CardHeader
          title="Workspace Layout"
          description="Altera exclusivamente largura e espaçamentos da área de trabalho."
        />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-3 gap-2">
            {modes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => update("workspaceMode", mode.value)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors duration-150 ${
                  preferences.workspaceMode === mode.value
                    ? "border-terminal-accent/60 bg-terminal-accent/10 text-terminal-accent"
                    : "border-terminal-border text-terminal-muted"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] text-terminal-positive">
              {savedMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                resetPreferences();
                setSavedMessage("Preferências padrão restauradas.");
              }}
              disabled={
                JSON.stringify(preferences) ===
                JSON.stringify(DEFAULT_WORKSPACE_PREFERENCES)
              }
              className="rounded-md border border-terminal-border px-3 py-2 text-xs text-terminal-muted disabled:opacity-40"
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
