"use client";

import { useRef } from "react";

import { useAcademy } from "@/components/academy/AcademyProvider";
import { useDialogFocus } from "@/lib/useDialogFocus";

const TOUR_STEPS = [
  {
    icon: "XAU",
    eyebrow: "Boas-vindas",
    title: "Bem-vindo ao XAU AI Terminal",
    description:
      "Este tour apresenta as áreas principais da plataforma. Todas as leituras são educacionais e derivadas dos dados disponíveis.",
  },
  {
    icon: "▦",
    eyebrow: "Visão principal",
    title: "Dashboard institucional",
    description:
      "Concentre a leitura em regime, Dealer Bias, confiança, walls, gamma, Open Interest e volatilidade. Use as estrelas para criar um workspace pessoal.",
  },
  {
    icon: "▶",
    eyebrow: "Histórico",
    title: "Market Replay",
    description:
      "Navegue pela timeline de snapshots, reconstrua o Dashboard e compare como a estrutura mudou entre dois momentos.",
  },
  {
    icon: "▥",
    eyebrow: "Estrutura por strike",
    title: "Heatmap e Curva de Gamma",
    description:
      "Observe onde as exposições positivas e negativas se concentram. O mapa deve ser combinado com regime, walls e contexto do snapshot.",
  },
  {
    icon: "DR",
    eyebrow: "Leitura determinística",
    title: "Dealer Report",
    description:
      "O relatório reúne regime, intensidade, riscos, fatores de decisão e ação educacional sem utilizar IA externa.",
  },
  {
    icon: "AI",
    eyebrow: "Síntese institucional",
    title: "AI Market Summary",
    description:
      "A síntese transforma os indicadores já calculados em uma explicação textual baseada em regras. Ela não cria dados nem substitui análise própria.",
  },
] as const;

export function WelcomeTour() {
  const {
    finishTour,
    isTourOpen,
    nextTourStep,
    previousTourStep,
    tourStep,
  } = useAcademy();
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(isTourOpen, dialogRef, finishTour);
  if (!isTourOpen) return null;

  const step = TOUR_STEPS[tourStep] ?? TOUR_STEPS[0];
  const isLastStep = tourStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        tabIndex={-1}
        className="workspace-scale w-full max-w-lg overflow-hidden rounded-xl border border-terminal-accent/40 bg-terminal-card shadow-[0_30px_100px_rgb(0_0_0/55%)]"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-terminal-accent to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-terminal-accent/35 bg-terminal-accent/10 font-mono text-xs font-bold text-terminal-accent">
              {step.icon}
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-terminal-accent">
                {step.eyebrow}
              </p>
              <h2
                id="welcome-tour-title"
                className="mt-1 text-xl font-semibold"
              >
                {step.title}
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-terminal-muted">
            {step.description}
          </p>

          <div
            aria-label={`Etapa ${tourStep + 1} de ${TOUR_STEPS.length}`}
            className="mt-6 flex gap-1.5"
          >
            {TOUR_STEPS.map((tourItem, index) => (
              <span
                key={tourItem.title}
                aria-hidden
                className={`h-1 flex-1 rounded-full ${
                  index <= tourStep
                    ? "bg-terminal-accent"
                    : "bg-terminal-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-terminal-border bg-terminal-panel/40 px-5 py-4">
          <button
            type="button"
            onClick={finishTour}
            data-dialog-initial-focus
            className="text-xs text-terminal-muted hover:text-terminal-text"
          >
            Pular tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={previousTourStep}
              disabled={tourStep === 0}
              className="rounded-md border border-terminal-border px-3 py-2 text-xs text-terminal-muted disabled:opacity-35"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={nextTourStep}
              className="rounded-md bg-terminal-accent px-4 py-2 text-xs font-semibold text-terminal-bg"
            >
              {isLastStep ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
