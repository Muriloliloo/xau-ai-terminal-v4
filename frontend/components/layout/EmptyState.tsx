import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "◇",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="workspace-fade grid min-h-64 place-items-center rounded-lg border border-dashed border-terminal-border bg-terminal-card/50 p-6 text-center">
      <div className="max-w-md">
        <span
          aria-hidden
          className="mx-auto grid size-10 place-items-center rounded-full border border-terminal-border bg-terminal-panel text-terminal-accent"
        >
          {icon}
        </span>
        <h2 className="mt-4 text-sm font-semibold">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-terminal-muted">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
