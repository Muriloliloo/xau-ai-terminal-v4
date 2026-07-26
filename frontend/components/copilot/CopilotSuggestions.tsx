export const COPILOT_SUGGESTIONS = [
  "Qual é o regime atual?",
  "Onde estão Call Wall, Put Wall e Gamma Flip?",
  "Como está o GEX e o mapa por strike?",
  "O que o Open Interest indica?",
  "Como está a volatilidade implícita?",
  "O que mudou entre os últimos snapshots?",
  "Quais são os principais riscos?",
] as const;

export function CopilotSuggestions({
  compact = false,
  onSelect,
}: {
  compact?: boolean;
  onSelect: (question: string) => void;
}) {
  return (
    <div
      aria-label="Perguntas rápidas"
      className={`flex gap-2 ${
        compact
          ? "overflow-x-auto pb-1"
          : "flex-wrap justify-center"
      }`}
    >
      {COPILOT_SUGGESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className={`shrink-0 rounded-full border border-terminal-border bg-terminal-panel/70 text-left text-terminal-muted transition-colors duration-150 hover:border-terminal-accent/45 hover:text-terminal-text ${
            compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
          }`}
        >
          {question}
        </button>
      ))}
    </div>
  );
}
