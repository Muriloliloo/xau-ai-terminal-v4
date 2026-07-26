export const ACADEMY_STORAGE_KEY = "xau-terminal.academy.progress.v1";

export interface AcademyProgress {
  completedLessonIds: string[];
  tourCompleted: boolean;
}

export const DEFAULT_ACADEMY_PROGRESS: AcademyProgress = {
  completedLessonIds: [],
  tourCompleted: false,
};

export function normalizeAcademyProgress(value: unknown): AcademyProgress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_ACADEMY_PROGRESS;
  }

  const record = value as Record<string, unknown>;
  const completedLessonIds = Array.isArray(record.completedLessonIds)
    ? [
        ...new Set(
          record.completedLessonIds
            .filter(
              (lessonId): lessonId is string =>
                typeof lessonId === "string" && lessonId.trim().length > 0,
            )
            .map((lessonId) => lessonId.trim())
            .slice(0, 100),
        ),
      ]
    : [];

  return {
    completedLessonIds,
    tourCompleted:
      typeof record.tourCompleted === "boolean"
        ? record.tourCompleted
        : false,
  };
}
