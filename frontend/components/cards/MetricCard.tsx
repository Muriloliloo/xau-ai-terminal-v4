"use client";

import { type ReactNode, useEffect, useMemo } from "react";

import { LearnButton } from "@/components/academy/LearnButton";
import { FavoriteButton } from "@/components/cards/FavoriteButton";
import { Tooltip } from "@/components/cards/Tooltip";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { getIndicatorDescription } from "@/lib/indicatorDescriptions";
import { UNAVAILABLE_LABEL } from "@/lib/formatters";
import type { FavoriteIndicator, MetricTone } from "@/types/workspace";

const toneClasses: Record<MetricTone, string> = {
  neutral: "text-terminal-text",
  positive: "text-terminal-positive",
  negative: "text-terminal-negative",
  accent: "text-terminal-accent",
  flip: "text-terminal-flip",
};

interface MetricCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: MetricTone;
  tooltip?: string;
  favoriteId?: string;
}

function createIndicatorId(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function valueToText(value: ReactNode): string {
  if (value == null) return UNAVAILABLE_LABEL;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "Valor dinâmico";
}

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
  tooltip,
  favoriteId,
}: MetricCardProps) {
  const { isFavorite, preferences, syncFavorite } = useWorkspace();
  const valueSize =
    typeof value === "string" && value.length > 14 ? "text-sm" : "text-lg";
  const description = tooltip ?? getIndicatorDescription(label);
  const valueText = valueToText(value);
  const indicator = useMemo<FavoriteIndicator>(
    () => ({
      id: favoriteId ?? createIndicatorId(label),
      label,
      value: valueText,
      helper,
      tone,
      tooltip: description,
      updatedAt: new Date().toISOString(),
    }),
    [description, favoriteId, helper, label, tone, valueText],
  );

  useEffect(() => {
    if (isFavorite(indicator.id)) syncFavorite(indicator);
  }, [indicator, isFavorite, syncFavorite]);

  return (
    <article
      className="workspace-card workspace-scale relative h-[102px] max-h-[105px] min-w-0 rounded-lg border border-terminal-border bg-terminal-card px-3.5 py-3 shadow-[0_10px_24px_rgb(0_0_0/12%)] transition-[border-color,transform] duration-150 hover:border-terminal-border/90"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.13em] text-terminal-muted">
          {label}
        </p>
        <span className="flex items-center gap-1">
          <LearnButton indicatorLabel={label} showLabel />
          <FavoriteButton indicator={indicator} />
          <Tooltip content={description} label={label} />
        </span>
      </div>
      <div className={`mt-2 truncate font-mono font-semibold ${valueSize} ${toneClasses[tone]}`}>
        {value}
      </div>
      {helper && preferences.showDetailedValues ? (
        <p className="mt-1 truncate text-[11px] text-terminal-muted">{helper}</p>
      ) : null}
    </article>
  );
}
