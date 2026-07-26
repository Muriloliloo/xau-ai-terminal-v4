"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ACADEMY_STORAGE_KEY = "xau-terminal.academy.progress.v1";
const TOUR_LAST_STEP = 5;

interface AcademyProgress {
  completedLessonIds: string[];
  tourCompleted: boolean;
}

interface AcademyContextValue {
  hydrated: boolean;
  activeLessonId: string | null;
  completedLessonIds: string[];
  isTourOpen: boolean;
  tourCompleted: boolean;
  tourStep: number;
  openLesson: (lessonId: string) => void;
  closeLesson: () => void;
  completeLesson: (lessonId: string) => void;
  isLessonCompleted: (lessonId: string) => boolean;
  startTour: () => void;
  previousTourStep: () => void;
  nextTourStep: () => void;
  finishTour: () => void;
}

const DEFAULT_PROGRESS: AcademyProgress = {
  completedLessonIds: [],
  tourCompleted: false,
};

const AcademyContext = createContext<AcademyContextValue | null>(null);

function readProgress(): AcademyProgress {
  try {
    const stored = window.localStorage.getItem(ACADEMY_STORAGE_KEY);
    if (!stored) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(stored) as Partial<AcademyProgress>;
    return {
      completedLessonIds: Array.isArray(parsed.completedLessonIds)
        ? parsed.completedLessonIds
        : [],
      tourCompleted: Boolean(parsed.tourCompleted),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeProgress(progress: AcademyProgress): void {
  try {
    window.localStorage.setItem(
      ACADEMY_STORAGE_KEY,
      JSON.stringify(progress),
    );
  } catch {
    // Progress remains available in memory when browser storage is blocked.
  }
}

export function AcademyProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<AcademyProgress>(DEFAULT_PROGRESS);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isTourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const storedProgress = readProgress();
      setProgress(storedProgress);
      setTourOpen(!storedProgress.tourCompleted);
      setTourStep(0);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeProgress(progress);
  }, [hydrated, progress]);

  useEffect(() => {
    if (!activeLessonId && !isTourOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeLessonId, isTourOpen]);

  useEffect(() => {
    function closeDrawerWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && activeLessonId) {
        setActiveLessonId(null);
      }
    }

    window.addEventListener("keydown", closeDrawerWithEscape);
    return () =>
      window.removeEventListener("keydown", closeDrawerWithEscape);
  }, [activeLessonId]);

  const openLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const closeLesson = useCallback(() => {
    setActiveLessonId(null);
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setProgress((current) =>
      current.completedLessonIds.includes(lessonId)
        ? current
        : {
            ...current,
            completedLessonIds: [...current.completedLessonIds, lessonId],
          },
    );
  }, []);

  const isLessonCompleted = useCallback(
    (lessonId: string) => progress.completedLessonIds.includes(lessonId),
    [progress.completedLessonIds],
  );

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourOpen(true);
  }, []);

  const finishTour = useCallback(() => {
    setProgress((current) => ({ ...current, tourCompleted: true }));
    setTourOpen(false);
    setTourStep(0);
  }, []);

  const previousTourStep = useCallback(() => {
    setTourStep((current) => Math.max(0, current - 1));
  }, []);

  const nextTourStep = useCallback(() => {
    if (tourStep >= TOUR_LAST_STEP) {
      finishTour();
      return;
    }
    setTourStep(tourStep + 1);
  }, [finishTour, tourStep]);

  const value = useMemo<AcademyContextValue>(
    () => ({
      hydrated,
      activeLessonId,
      completedLessonIds: progress.completedLessonIds,
      isTourOpen,
      tourCompleted: progress.tourCompleted,
      tourStep,
      openLesson,
      closeLesson,
      completeLesson,
      isLessonCompleted,
      startTour,
      previousTourStep,
      nextTourStep,
      finishTour,
    }),
    [
      activeLessonId,
      closeLesson,
      completeLesson,
      finishTour,
      hydrated,
      isLessonCompleted,
      isTourOpen,
      nextTourStep,
      openLesson,
      previousTourStep,
      progress.completedLessonIds,
      progress.tourCompleted,
      startTour,
      tourStep,
    ],
  );

  return (
    <AcademyContext.Provider value={value}>
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy(): AcademyContextValue {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error("useAcademy deve ser usado dentro de AcademyProvider.");
  }
  return context;
}
