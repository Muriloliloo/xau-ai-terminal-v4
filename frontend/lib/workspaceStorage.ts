import type {
  FavoriteIndicator,
  MetricTone,
  WorkspaceMode,
  WorkspacePreferences,
  WorkspaceTheme,
} from "@/types/workspace";

export const PREFERENCES_STORAGE_KEY = "xau-terminal.preferences.v1";
export const FAVORITES_STORAGE_KEY = "xau-terminal.favorites.v1";

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  theme: "terminal",
  animations: true,
  compactMode: false,
  autoRefresh: false,
  showTooltips: true,
  showDetailedValues: true,
  workspaceMode: "normal",
};

const THEMES = new Set<WorkspaceTheme>(["terminal", "obsidian"]);
const MODES = new Set<WorkspaceMode>(["compact", "normal", "expanded"]);
const TONES = new Set<MetricTone>([
  "neutral",
  "positive",
  "negative",
  "accent",
  "flip",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeWorkspacePreferences(
  value: unknown,
): WorkspacePreferences {
  if (!isRecord(value)) return DEFAULT_WORKSPACE_PREFERENCES;

  return {
    theme: THEMES.has(value.theme as WorkspaceTheme)
      ? (value.theme as WorkspaceTheme)
      : DEFAULT_WORKSPACE_PREFERENCES.theme,
    animations: booleanOr(
      value.animations,
      DEFAULT_WORKSPACE_PREFERENCES.animations,
    ),
    compactMode: booleanOr(
      value.compactMode,
      DEFAULT_WORKSPACE_PREFERENCES.compactMode,
    ),
    autoRefresh: booleanOr(
      value.autoRefresh,
      DEFAULT_WORKSPACE_PREFERENCES.autoRefresh,
    ),
    showTooltips: booleanOr(
      value.showTooltips,
      DEFAULT_WORKSPACE_PREFERENCES.showTooltips,
    ),
    showDetailedValues: booleanOr(
      value.showDetailedValues,
      DEFAULT_WORKSPACE_PREFERENCES.showDetailedValues,
    ),
    workspaceMode: MODES.has(value.workspaceMode as WorkspaceMode)
      ? (value.workspaceMode as WorkspaceMode)
      : DEFAULT_WORKSPACE_PREFERENCES.workspaceMode,
  };
}

function normalizeFavorite(value: unknown): FavoriteIndicator | null {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || !value.id.trim()
    || typeof value.label !== "string"
    || typeof value.value !== "string"
    || typeof value.tooltip !== "string"
    || typeof value.updatedAt !== "string"
    || !TONES.has(value.tone as MetricTone)
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    label: value.label,
    value: value.value,
    helper: typeof value.helper === "string" ? value.helper : undefined,
    tone: value.tone as MetricTone,
    tooltip: value.tooltip,
    updatedAt: value.updatedAt,
  };
}

export function normalizeFavoriteIndicators(
  value: unknown,
): FavoriteIndicator[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, FavoriteIndicator>();
  for (const item of value.slice(0, 100)) {
    const favorite = normalizeFavorite(item);
    if (favorite) unique.set(favorite.id, favorite);
  }
  return [...unique.values()];
}
