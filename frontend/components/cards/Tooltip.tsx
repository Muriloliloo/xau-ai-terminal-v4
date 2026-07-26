"use client";

import { useId } from "react";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

interface TooltipProps {
  content: string;
  label: string;
}

export function Tooltip({ content, label }: TooltipProps) {
  const { preferences } = useWorkspace();
  const tooltipId = useId();
  if (!preferences.showTooltips) return null;

  return (
    <span className="smart-tooltip relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`Ajuda sobre ${label}`}
        aria-describedby={tooltipId}
        className="grid size-4 place-items-center rounded-full border border-terminal-border font-mono text-[9px] text-terminal-muted transition-colors duration-150 hover:border-terminal-accent/60 hover:text-terminal-accent"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="smart-tooltip-content pointer-events-none absolute right-0 top-[calc(100%+6px)] z-50 w-56 rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-left text-[10px] font-normal normal-case leading-4 tracking-normal text-terminal-text opacity-0 shadow-2xl"
      >
        {content}
      </span>
    </span>
  );
}
