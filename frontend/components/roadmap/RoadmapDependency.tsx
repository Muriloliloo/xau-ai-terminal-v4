import type { RoadmapPhase } from "@/types/roadmap";

interface RoadmapDependencyProps {
  dependency: RoadmapPhase;
}

export function RoadmapDependency({
  dependency,
}: RoadmapDependencyProps) {
  return (
    <a
      href={`#${dependency.id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-terminal-border bg-terminal-panel px-2.5 py-1 font-mono text-[10px] text-terminal-muted transition-colors duration-150 hover:border-terminal-accent/50 hover:text-terminal-accent"
      aria-label={`Ir para dependência ${dependency.version}: ${dependency.title}`}
    >
      <span aria-hidden>↳</span>
      {dependency.version}
    </a>
  );
}
