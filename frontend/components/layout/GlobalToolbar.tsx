"use client";

import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

export function GlobalToolbar() {
  const { isFullscreen, preferences, toggleFullscreen } = useWorkspace();
  const modeLabel = preferences.compactMode
    ? "Compacto"
    : {
        compact: "Compacto",
        normal: "Normal",
        expanded: "Expandido",
      }[preferences.workspaceMode];

  return (
    <div className="workspace-slide mb-3 flex flex-col gap-2 rounded-lg border border-terminal-border bg-terminal-sidebar/90 p-2.5 shadow-[0_10px_28px_rgb(0_0_0/12%)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <GlobalSearch />
      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
        <span className="hidden rounded border border-terminal-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted md:inline-flex">
          Layout {modeLabel}
        </span>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          title={isFullscreen ? "ESC para sair" : "Ocultar Sidebar"}
          className="rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent transition-colors duration-150 hover:bg-terminal-accent/15"
        >
          {isFullscreen ? "Restaurar Workspace" : "Expandir Workspace"}
        </button>
      </div>
    </div>
  );
}
