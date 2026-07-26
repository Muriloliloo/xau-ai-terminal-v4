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

import type {
  FavoriteIndicator,
  WorkspacePreferences,
} from "@/types/workspace";

const PREFERENCES_STORAGE_KEY = "xau-terminal.preferences.v1";
const FAVORITES_STORAGE_KEY = "xau-terminal.favorites.v1";

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  theme: "terminal",
  animations: true,
  compactMode: false,
  autoRefresh: false,
  showTooltips: true,
  showDetailedValues: true,
  workspaceMode: "normal",
};

interface WorkspaceContextValue {
  hydrated: boolean;
  isFullscreen: boolean;
  favorites: FavoriteIndicator[];
  preferences: WorkspacePreferences;
  setFullscreen: (active: boolean) => void;
  toggleFullscreen: () => void;
  updatePreferences: (updates: Partial<WorkspacePreferences>) => void;
  resetPreferences: () => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (indicator: FavoriteIndicator) => void;
  syncFavorite: (indicator: FavoriteIndicator) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // UI preferences remain active in memory when browser storage is blocked.
  }
}

export function WorkspaceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [hydrated, setHydrated] = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);
  const [preferences, setPreferences] = useState<WorkspacePreferences>(
    DEFAULT_WORKSPACE_PREFERENCES,
  );
  const [favorites, setFavorites] = useState<FavoriteIndicator[]>([]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const savedPreferences = readStoredValue<Partial<WorkspacePreferences>>(
        PREFERENCES_STORAGE_KEY,
        {},
      );
      setPreferences({
        ...DEFAULT_WORKSPACE_PREFERENCES,
        ...savedPreferences,
      });
      setFavorites(
        readStoredValue<FavoriteIndicator[]>(FAVORITES_STORAGE_KEY, []),
      );
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredValue(PREFERENCES_STORAGE_KEY, preferences);
  }, [hydrated, preferences]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredValue(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites, hydrated]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.animations = preferences.animations
      ? "enabled"
      : "disabled";
  }, [preferences.animations, preferences.theme]);

  useEffect(() => {
    function leaveFullscreen(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }

    window.addEventListener("keydown", leaveFullscreen);
    return () => window.removeEventListener("keydown", leaveFullscreen);
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<WorkspacePreferences>) => {
      setPreferences((current) => ({ ...current, ...updates }));
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_WORKSPACE_PREFERENCES);
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((favorite) => favorite.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback((indicator: FavoriteIndicator) => {
    setFavorites((current) =>
      current.some((favorite) => favorite.id === indicator.id)
        ? current.filter((favorite) => favorite.id !== indicator.id)
        : [...current, indicator],
    );
  }, []);

  const syncFavorite = useCallback((indicator: FavoriteIndicator) => {
    setFavorites((current) => {
      const existing = current.find(
        (favorite) => favorite.id === indicator.id,
      );
      if (!existing) return current;

      const unchanged =
        existing.label === indicator.label &&
        existing.value === indicator.value &&
        existing.helper === indicator.helper &&
        existing.tone === indicator.tone &&
        existing.tooltip === indicator.tooltip;
      if (unchanged) return current;

      return current.map((favorite) =>
        favorite.id === indicator.id ? indicator : favorite,
      );
    });
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      hydrated,
      isFullscreen,
      favorites,
      preferences,
      setFullscreen,
      toggleFullscreen: () => setFullscreen((current) => !current),
      updatePreferences,
      resetPreferences,
      isFavorite,
      toggleFavorite,
      syncFavorite,
    }),
    [
      favorites,
      hydrated,
      isFavorite,
      isFullscreen,
      preferences,
      resetPreferences,
      syncFavorite,
      toggleFavorite,
      updatePreferences,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace deve ser usado dentro de WorkspaceProvider.");
  }
  return context;
}
