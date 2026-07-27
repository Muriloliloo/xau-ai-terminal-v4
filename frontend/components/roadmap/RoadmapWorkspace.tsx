import { StatusBadge } from "@/components/cards/StatusBadge";
import { RoadmapPhase } from "@/components/roadmap/RoadmapPhase";
import {
  PRODUCT_ROADMAP,
  ROADMAP_STATUS_LABELS,
} from "@/lib/productRoadmap";
import { ROADMAP_STATUSES, type RoadmapStatus } from "@/types/roadmap";

const LEGEND_TONES: Record<
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

export function RoadmapWorkspace() {
  const concluded = PRODUCT_ROADMAP.phases.filter(
    (phase) => phase.status === "concluído",
  ).length;
  const active = PRODUCT_ROADMAP.phases.filter((phase) =>
    ["em validação", "em desenvolvimento"].includes(phase.status),
  ).length;

  return (
    <div className="space-y-4">
      <header className="workspace-fade overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
        <div className="terminal-grid border-b border-terminal-border px-4 py-6 sm:px-6 sm:py-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-terminal-accent">
            Product Roadmap
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-terminal-text sm:text-3xl">
                {PRODUCT_ROADMAP.product}
              </h1>
              <p className="mt-1 text-sm text-terminal-muted">
                {PRODUCT_ROADMAP.subtitle}
              </p>
            </div>
            <StatusBadge label="Roadmap declarativo" tone="neutral" />
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 sm:p-6">
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-terminal-muted">
              Missão
            </h2>
            <p className="mt-2 text-sm leading-6 text-terminal-text">
              “{PRODUCT_ROADMAP.mission}”
            </p>
          </section>
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-terminal-muted">
              Visão
            </h2>
            <p className="mt-2 text-sm leading-6 text-terminal-text">
              {PRODUCT_ROADMAP.vision}
            </p>
          </section>
        </div>
      </header>

      <section
        aria-labelledby="roadmap-pillars"
        className="rounded-lg border border-terminal-border bg-terminal-card p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-terminal-accent">
              Arquitetura de produto
            </p>
            <h2 id="roadmap-pillars" className="mt-1 text-lg font-semibold">
              Sete pilares da plataforma
            </h2>
          </div>
          <p className="text-xs text-terminal-muted">
            {concluded} fase concluída · {active} em progresso
          </p>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_ROADMAP.pillars.map((pillar, index) => (
            <li
              key={pillar}
              className="flex items-center gap-3 rounded-md border border-terminal-border bg-terminal-panel px-3 py-2.5 text-xs text-terminal-text"
            >
              <span className="font-mono text-terminal-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              {pillar}
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="roadmap-statuses"
        className="rounded-lg border border-terminal-border bg-terminal-card p-4"
      >
        <h2
          id="roadmap-statuses"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-terminal-muted"
        >
          Status permitidos
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROADMAP_STATUSES.map((status) => (
            <StatusBadge
              key={status}
              label={ROADMAP_STATUS_LABELS[status]}
              tone={LEGEND_TONES[status]}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-timeline">
        <div className="mb-3 flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-terminal-accent">
            Evolução do produto
          </p>
          <h2 id="roadmap-timeline" className="text-xl font-semibold">
            Foundation → V5 → V6
          </h2>
          <p className="text-xs leading-5 text-terminal-muted">
            O progresso é declarado manualmente e não representa prazo. Datas
            só serão adicionadas após validação de escopo e dependências.
          </p>
        </div>
        <div className="relative space-y-3 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-terminal-border sm:before:left-4">
          {PRODUCT_ROADMAP.phases.map((phase) => (
            <div key={phase.id} className="relative pl-7 sm:pl-9">
              <span
                aria-hidden
                className="absolute left-[7px] top-6 size-2.5 rounded-full border-2 border-terminal-bg bg-terminal-accent sm:left-[11px]"
              />
              <RoadmapPhase
                phase={phase}
                phases={PRODUCT_ROADMAP.phases}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section
          aria-labelledby="roadmap-limitations"
          className="rounded-lg border border-terminal-flip/30 bg-terminal-card p-4 sm:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terminal-flip">
            Transparência
          </p>
          <h2 id="roadmap-limitations" className="mt-1 text-lg font-semibold">
            Limitações atuais
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-terminal-muted">
            {PRODUCT_ROADMAP.currentLimitations.map((limitation) => (
              <li key={limitation} className="flex gap-2">
                <span aria-hidden className="text-terminal-flip">
                  —
                </span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="roadmap-future"
          className="rounded-lg border border-terminal-accent/30 bg-terminal-card p-4 sm:p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terminal-accent">
            Visão, não compromisso
          </p>
          <h2 id="roadmap-future" className="mt-1 text-lg font-semibold">
            Futuro da plataforma
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PRODUCT_ROADMAP.futureVision.map((item) => (
              <li
                key={item}
                className="rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-xs leading-5 text-terminal-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="rounded-md border border-terminal-border bg-terminal-panel px-4 py-3 text-xs leading-5 text-terminal-muted">
        Este roadmap organiza hipóteses e dependências de produto. Não constitui
        promessa de data, desempenho de mercado ou resultado financeiro.
      </p>
    </div>
  );
}
