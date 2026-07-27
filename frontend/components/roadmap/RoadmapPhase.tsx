import { StatusBadge } from "@/components/cards/StatusBadge";
import { RoadmapDependency } from "@/components/roadmap/RoadmapDependency";
import { RoadmapMilestone } from "@/components/roadmap/RoadmapMilestone";
import { RoadmapProgress } from "@/components/roadmap/RoadmapProgress";
import { ROADMAP_STATUS_LABELS } from "@/lib/productRoadmap";
import type {
  RoadmapPhase as RoadmapPhaseModel,
  RoadmapStatus,
} from "@/types/roadmap";

interface RoadmapPhaseProps {
  phase: RoadmapPhaseModel;
  phases?: RoadmapPhaseModel[];
}

const STATUS_TONES: Record<
  RoadmapStatus,
  "positive" | "negative" | "warning" | "neutral"
> = {
  "concluído": "positive",
  "em validação": "warning",
  "em desenvolvimento": "warning",
  planejado: "neutral",
  futuro: "neutral",
  bloqueado: "negative",
};

const STATUS_MARKERS: Record<RoadmapStatus, string> = {
  "concluído": "✓",
  "em validação": "◌",
  "em desenvolvimento": "◆",
  planejado: "○",
  futuro: "◇",
  bloqueado: "!",
};

export function RoadmapPhase({
  phase,
  phases = [],
}: RoadmapPhaseProps) {
  const dependencies = phase.dependencies
    .map((dependencyId) =>
      phases.find((candidate) => candidate.id === dependencyId),
    )
    .filter((dependency): dependency is RoadmapPhaseModel => Boolean(dependency));

  return (
    <article
      id={phase.id}
      aria-labelledby={`${phase.id}-title`}
      className="workspace-fade scroll-mt-20 overflow-hidden rounded-lg border border-terminal-border bg-terminal-card shadow-[0_12px_32px_rgb(0_0_0/14%)]"
    >
      <div className="border-b border-terminal-border bg-terminal-panel/45 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-terminal-accent">
              {phase.version}
            </p>
            <h2
              id={`${phase.id}-title`}
              className="mt-1 text-lg font-semibold text-terminal-text"
            >
              {phase.title}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-terminal-muted">
              {phase.objective}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="font-mono text-sm text-terminal-accent"
            >
              {STATUS_MARKERS[phase.status]}
            </span>
            <StatusBadge
              label={ROADMAP_STATUS_LABELS[phase.status]}
              tone={STATUS_TONES[phase.status]}
            />
          </div>
        </div>
        <div className="mt-4 max-w-xl">
          <RoadmapProgress
            label="Progresso declarado"
            value={phase.progress}
          />
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <section aria-label={`Dependências de ${phase.version}`}>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-terminal-muted">
            Dependências
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {dependencies.length ? (
              dependencies.map((dependency) => (
                <RoadmapDependency
                  key={dependency.id}
                  dependency={dependency}
                />
              ))
            ) : (
              <span className="text-xs text-terminal-muted">
                Fundação independente
              </span>
            )}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <RoadmapMilestone
            title="Entregas"
            items={phase.deliverables}
            marker="→"
          />
          <RoadmapMilestone
            title="Critérios de conclusão"
            items={phase.criteria}
            marker="✓"
          />
        </div>

        {phase.risks?.length || phase.limitations?.length ? (
          <div className="grid gap-4 border-t border-terminal-border/70 pt-4 lg:grid-cols-2">
            <RoadmapMilestone
              title="Riscos"
              items={phase.risks}
              marker="!"
            />
            <RoadmapMilestone
              title="Limitações"
              items={phase.limitations}
              marker="—"
            />
          </div>
        ) : null}

        {phase.validationNote ? (
          <p className="rounded-md border border-terminal-flip/30 bg-terminal-flip/5 px-3 py-2 text-xs leading-5 text-terminal-flip">
            {phase.validationNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}
