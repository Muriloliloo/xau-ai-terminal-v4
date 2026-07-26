import type { ReactNode } from "react";

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-terminal-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-terminal-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-terminal-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
