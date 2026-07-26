"use client";

import Link from "next/link";

import { MetricCard } from "@/components/cards/MetricCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Header } from "@/components/layout/Header";
import { SectionTitle } from "@/components/layout/SectionTitle";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

export function FavoritesWorkspace() {
  const { favorites, hydrated } = useWorkspace();

  return (
    <>
      <Header
        eyebrow="Workspace pessoal"
        title="Favoritos"
        description="Indicadores fixados para consulta rápida neste navegador."
      />

      {!hydrated ? (
        <div className="loading-shimmer h-56 rounded-lg" />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="☆"
          title="Nenhum indicador favorito"
          description="Use a estrela disponível nos cards do Dashboard para montar seu workspace personalizado."
          action={
            <Link
              href="/"
              className="inline-flex rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent"
            >
              Abrir Dashboard
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <SectionTitle
            eyebrow="Seleção local"
            title="Indicadores fixados"
            description={`${favorites.length} indicador${favorites.length === 1 ? "" : "es"} no workspace pessoal.`}
          />
          <section
            aria-label="Indicadores favoritos"
            className="workspace-fade grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
          >
            {favorites.map((favorite) => (
              <MetricCard
                key={favorite.id}
                favoriteId={favorite.id}
                label={favorite.label}
                value={favorite.value}
                helper={favorite.helper}
                tone={favorite.tone}
                tooltip={favorite.tooltip}
              />
            ))}
          </section>
        </div>
      )}
    </>
  );
}
