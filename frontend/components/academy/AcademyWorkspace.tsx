"use client";

import { useMemo, useState } from "react";

import { AcademyVisualExample } from "@/components/academy/AcademyVisualExample";
import { useAcademy } from "@/components/academy/AcademyProvider";
import { CardHeader } from "@/components/cards/CardHeader";
import { StatusBadge } from "@/components/cards/StatusBadge";
import { Header } from "@/components/layout/Header";
import {
  ACADEMY_LESSONS,
  type AcademyCategory,
  PRACTICAL_SCENARIOS,
} from "@/lib/academyContent";

const categories: Array<AcademyCategory | "Todos"> = [
  "Todos",
  "Gamma",
  "Dealer",
  "Open Interest",
  "Volatilidade",
  "Estrutura",
];

const scenarioToneStyles = {
  positive: "border-terminal-positive/35 text-terminal-positive",
  negative: "border-terminal-negative/35 text-terminal-negative",
  accent: "border-terminal-accent/35 text-terminal-accent",
  warning: "border-terminal-flip/35 text-terminal-flip",
  neutral: "border-terminal-border text-terminal-text",
};

export function AcademyWorkspace() {
  const {
    completedLessonIds,
    hydrated,
    isLessonCompleted,
    openLesson,
    startTour,
    tourCompleted,
  } = useAcademy();
  const [category, setCategory] = useState<AcademyCategory | "Todos">("Todos");
  const filteredLessons = useMemo(
    () =>
      category === "Todos"
        ? ACADEMY_LESSONS
        : ACADEMY_LESSONS.filter((lesson) => lesson.category === category),
    [category],
  );
  const progress = Math.round(
    (completedLessonIds.length / ACADEMY_LESSONS.length) * 100,
  );

  return (
    <>
      <Header
        eyebrow="Educação institucional"
        title="Institutional Academy"
        description="Aprenda a interpretar os indicadores do terminal, suas limitações e as combinações mais úteis."
      />

      <section className="workspace-fade mb-3 overflow-hidden rounded-lg border border-terminal-border bg-terminal-card">
        <CardHeader
          title="Seu progresso"
          description={`${completedLessonIds.length} de ${ACADEMY_LESSONS.length} fichas concluídas neste navegador.`}
          action={
            <button
              type="button"
              onClick={startTour}
              className="rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent"
            >
              {tourCompleted ? "Reiniciar Tour" : "Iniciar Tour"}
            </button>
          }
        />
        <div className="p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-terminal-muted">
            <span>Progresso Academy</span>
            <span className="text-terminal-accent">
              {hydrated ? `${progress}%` : "Carregando"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-terminal-border">
            <div
              className="h-full rounded-full bg-terminal-accent transition-[width] duration-200"
              style={{ width: `${hydrated ? progress : 0}%` }}
            />
          </div>
        </div>
      </section>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs transition-colors duration-150 ${
              category === item
                ? "border-terminal-accent/60 bg-terminal-accent/10 text-terminal-accent"
                : "border-terminal-border text-terminal-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <section
        aria-label="Fichas de indicadores"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {filteredLessons.map((lesson) => {
          const completed = isLessonCompleted(lesson.id);
          return (
            <article
              key={lesson.id}
              className="workspace-scale flex min-w-0 flex-col overflow-hidden rounded-lg border border-terminal-border bg-terminal-card"
            >
              <CardHeader
                title={lesson.title}
                description={lesson.whatIs}
                action={
                  completed ? (
                    <StatusBadge label="Concluído" tone="positive" />
                  ) : (
                    <StatusBadge label={lesson.category} />
                  )
                }
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <AcademyVisualExample example={lesson.example} />
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-[10px] text-terminal-muted">
                    {lesson.observe.length} pontos para observar
                  </p>
                  <button
                    type="button"
                    onClick={() => openLesson(lesson.id)}
                    className="rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent"
                  >
                    📖 Abrir ficha
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-terminal-accent">
            Leitura aplicada
          </p>
          <h2 className="mt-1 text-lg font-semibold">Exemplos Práticos</h2>
          <p className="mt-1 text-xs text-terminal-muted">
            Cenários hipotéticos para aprender relações entre indicadores.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PRACTICAL_SCENARIOS.map((scenario) => (
            <article
              key={scenario.id}
              className={`workspace-fade rounded-lg border bg-terminal-card p-4 ${scenarioToneStyles[scenario.tone]}`}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terminal-muted">
                {scenario.signal}
              </p>
              <h3 className="mt-2 text-sm font-semibold">{scenario.title}</h3>
              <p className="mt-2 text-xs leading-5 text-terminal-text">
                {scenario.interpretation}
              </p>
              <p className="mt-3 border-t border-terminal-border pt-3 text-[10px] leading-4 text-terminal-muted">
                <strong className="text-terminal-text">Observar:</strong>{" "}
                {scenario.observe}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
