"use client";

import { AcademyVisualExample } from "@/components/academy/AcademyVisualExample";
import { useAcademy } from "@/components/academy/AcademyProvider";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { getAcademyLessonById } from "@/lib/academyContent";

function LearningSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-terminal-accent">
        {title}
      </h3>
      <div className="mt-2 text-xs leading-5 text-terminal-muted">
        {children}
      </div>
    </section>
  );
}

export function AcademyDrawer() {
  const {
    activeLessonId,
    closeLesson,
    completeLesson,
    isLessonCompleted,
  } = useAcademy();
  const lesson = getAcademyLessonById(activeLessonId);
  if (!lesson) return null;

  const completed = isLessonCompleted(lesson.id);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel educacional"
        onClick={closeLesson}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="academy-drawer-title"
        className="workspace-slide relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-terminal-border bg-terminal-sidebar shadow-[-24px_0_60px_rgb(0_0_0/35%)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-terminal-border p-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-terminal-accent">
              Institutional Academy · {lesson.category}
            </p>
            <h2
              id="academy-drawer-title"
              className="mt-1 text-lg font-semibold"
            >
              {lesson.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {completed ? (
              <StatusBadge label="Concluído" tone="positive" />
            ) : null}
            <button
              type="button"
              onClick={closeLesson}
              aria-label="Fechar"
              className="grid size-8 place-items-center rounded-md border border-terminal-border text-terminal-muted transition-colors duration-150 hover:text-terminal-text"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <LearningSection title="O que é">
            <p>{lesson.whatIs}</p>
          </LearningSection>

          <LearningSection title="Como interpretar">
            <p>{lesson.interpretation}</p>
          </LearningSection>

          <LearningSection title="O que observar">
            <ul className="space-y-1.5">
              {lesson.observe.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-terminal-positive">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </LearningSection>

          <LearningSection title="Limitações">
            <ul className="space-y-1.5">
              {lesson.limitations.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-terminal-flip">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </LearningSection>

          <LearningSection title="Como combinar">
            <div className="flex flex-wrap gap-2">
              {lesson.combineWith.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-terminal-border bg-terminal-panel px-2.5 py-1 font-mono text-[9px] text-terminal-text"
                >
                  {item}
                </span>
              ))}
            </div>
          </LearningSection>

          <LearningSection title="Exemplo visual">
            <AcademyVisualExample example={lesson.example} />
            <p className="mt-2 text-[10px] leading-4">
              Exemplo hipotético para fins educacionais; não representa o
              snapshot atual.
            </p>
          </LearningSection>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-terminal-border bg-terminal-card p-4">
          <p className="text-[10px] text-terminal-muted">
            Progresso salvo neste navegador.
          </p>
          <button
            type="button"
            onClick={() => completeLesson(lesson.id)}
            disabled={completed}
            className="rounded-md border border-terminal-positive/40 bg-terminal-positive/10 px-3 py-2 text-xs font-semibold text-terminal-positive disabled:opacity-50"
          >
            {completed ? "Ficha concluída" : "Marcar como concluída"}
          </button>
        </div>
      </aside>
    </div>
  );
}
