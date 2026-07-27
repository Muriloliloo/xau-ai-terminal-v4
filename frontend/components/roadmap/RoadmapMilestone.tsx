interface RoadmapMilestoneProps {
  title: string;
  items?: string[];
  marker?: string;
}

export function RoadmapMilestone({
  title,
  items = [],
  marker = "•",
}: RoadmapMilestoneProps) {
  if (!items.length) return null;

  return (
    <section aria-label={title}>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-terminal-muted">
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-terminal-text">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="shrink-0 text-terminal-accent">
              {marker}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
