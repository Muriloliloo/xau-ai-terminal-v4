import { StatusBadge } from "@/components/cards/StatusBadge";

interface HeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  online?: boolean;
}

export function Header({
  eyebrow,
  title,
  description,
  online = true,
}: HeaderProps) {
  return (
    <header className="mb-4 flex flex-col justify-between gap-3 border-b border-terminal-border pb-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-terminal-accent">
          {eyebrow}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-terminal-text sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-terminal-muted">
          {description}
        </p>
      </div>
      <StatusBadge
        label={online ? "API conectada" : "API indisponível"}
        tone={online ? "positive" : "negative"}
      />
    </header>
  );
}
