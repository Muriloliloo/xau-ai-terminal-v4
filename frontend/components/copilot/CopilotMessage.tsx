import { formatTime } from "@/lib/formatters";
import type { CopilotMessage as CopilotMessageType } from "@/types/copilot";

export function CopilotMessage({
  message,
}: {
  message: CopilotMessageType;
}) {
  const assistant = message.role === "assistant";
  const answer = message.answer;

  return (
    <article
      className={`workspace-fade flex gap-3 ${
        assistant ? "justify-start" : "justify-end"
      }`}
    >
      {assistant ? (
        <div
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-terminal-accent/35 bg-terminal-accent/10 font-mono text-[10px] font-bold text-terminal-accent"
        >
          KE
        </div>
      ) : null}

      <div
        className={`min-w-0 ${
          assistant ? "w-full max-w-3xl" : "max-w-[85%] sm:max-w-[72%]"
        }`}
      >
        <div
          className={`rounded-xl border px-4 py-3 ${
            assistant
              ? "border-terminal-border bg-terminal-card"
              : "border-terminal-accent/35 bg-terminal-accent/10"
          }`}
        >
          {answer?.status === "answered" ? (
            <div className="space-y-4">
              {answer.sections.map((section) => (
                <section key={section.title}>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-terminal-accent">
                    {section.title}
                  </h3>
                  <div className="mt-2 space-y-1.5 text-sm leading-6 text-terminal-text">
                    {section.content.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </section>
              ))}

              <section className="border-t border-terminal-border pt-3">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-muted">
                  Indicadores utilizados
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {answer.citations.map((citation) => (
                    <span
                      key={citation.indicator}
                      title={citation.detail}
                      className="inline-flex rounded-full border border-terminal-border bg-terminal-panel px-2.5 py-1 font-mono text-[9px] text-terminal-accent"
                    >
                      {citation.indicator}
                    </span>
                  ))}
                </div>
                <ul className="mt-2 space-y-1 text-[10px] leading-4 text-terminal-muted">
                  {answer.citations.map((citation) => (
                    <li key={`${citation.indicator}-${citation.detail}`}>
                      <span className="text-terminal-text">
                        {citation.indicator}:
                      </span>{" "}
                      {citation.detail}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {message.content}
            </p>
          )}
        </div>
        <p
          className={`mt-1 px-1 font-mono text-[9px] text-terminal-muted ${
            assistant ? "text-left" : "text-right"
          }`}
        >
          {assistant ? "Knowledge Engine" : "Você"} ·{" "}
          {formatTime(message.createdAt)}
        </p>
      </div>
    </article>
  );
}
