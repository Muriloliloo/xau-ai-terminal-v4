import type { ReactNode } from "react";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-terminal-accent">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-terminal-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
