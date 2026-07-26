"use client";

import { useAcademy } from "@/components/academy/AcademyProvider";
import { getAcademyLessonForIndicator } from "@/lib/academyContent";

export function LearnButton({
  indicatorLabel,
  showLabel = false,
}: {
  indicatorLabel: string;
  showLabel?: boolean;
}) {
  const { openLesson } = useAcademy();
  const lesson = getAcademyLessonForIndicator(indicatorLabel);
  if (!lesson) return null;

  return (
    <button
      type="button"
      onClick={() => openLesson(lesson.id)}
      aria-label={`Aprender sobre ${indicatorLabel}`}
      title={`Aprender sobre ${indicatorLabel}`}
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded border border-terminal-accent/25 bg-terminal-accent/5 px-1.5 font-mono text-[9px] text-terminal-accent transition-colors duration-150 hover:border-terminal-accent/50 hover:bg-terminal-accent/10"
    >
      <span aria-hidden>📖</span>
      {showLabel ? <span>Aprender</span> : <span className="sr-only">Aprender</span>}
    </button>
  );
}
