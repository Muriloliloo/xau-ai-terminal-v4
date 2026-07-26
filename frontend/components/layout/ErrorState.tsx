interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

export function ErrorState({
  message,
  onRetry,
  title = "Não foi possível carregar a análise.",
}: ErrorStateProps) {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="max-w-md rounded-lg border border-terminal-negative/40 bg-terminal-negative/5 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-terminal-negative">
          Falha de comunicação
        </p>
        <h2 className="mt-3 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-terminal-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-md bg-terminal-accent px-4 py-2 text-sm font-semibold text-terminal-bg transition hover:brightness-110"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
