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

import {
  ACADEMY_STORAGE_KEY,
  type AcademyProgress,
  DEFAULT_ACADEMY_PROGRESS,
  normalizeAcademyProgress,
} from "@/lib/academyStorage";
import { readStoredJson, writeStoredJson } from "@/lib/storage";

const TOUR_LAST_STEP = 5;

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

const AcademyContext = createContext<AcademyContextValue | null>(null);

export function AcademyProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<AcademyProgress>(
    DEFAULT_ACADEMY_PROGRESS,
  );
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isTourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const storedProgress = readStoredJson(
        window.localStorage,
        ACADEMY_STORAGE_KEY,
        DEFAULT_ACADEMY_PROGRESS,
        normalizeAcademyProgress,
      );
      setProgress(storedProgress);
      setTourOpen(!storedProgress.tourCompleted);
      setTourStep(0);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredJson(window.localStorage, ACADEMY_STORAGE_KEY, progress);
  }, [hydrated, progress]);

  useEffect(() => {
    if (!activeLessonId && !isTourOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeLessonId, isTourOpen]);

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
