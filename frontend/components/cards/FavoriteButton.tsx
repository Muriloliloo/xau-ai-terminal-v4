"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type { FavoriteIndicator } from "@/types/workspace";

export function FavoriteButton({
  indicator,
}: {
  indicator: FavoriteIndicator;
}) {
  const { isFavorite, toggleFavorite } = useWorkspace();
  const active = isFavorite(indicator.id);

  return (
    <button
      type="button"
      aria-label={
        active
          ? `Remover ${indicator.label} dos favoritos`
          : `Adicionar ${indicator.label} aos favoritos`
      }
      aria-pressed={active}
      title={active ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
      onClick={() => toggleFavorite(indicator)}
      className={`grid size-4 shrink-0 place-items-center rounded text-xs leading-none transition-colors duration-150 ${
        active
          ? "text-terminal-flip"
          : "text-terminal-muted hover:text-terminal-flip"
      }`}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
