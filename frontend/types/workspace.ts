export type WorkspaceMode = "compact" | "normal" | "expanded";
export type WorkspaceTheme = "terminal" | "obsidian";
export type MetricTone =
  | "neutral"
  | "positive"
  | "negative"
  | "accent"
  | "flip";

export interface WorkspacePreferences {
  theme: WorkspaceTheme;
  animations: boolean;
  compactMode: boolean;
  autoRefresh: boolean;
  showTooltips: boolean;
  showDetailedValues: boolean;
  workspaceMode: WorkspaceMode;
}

export interface FavoriteIndicator {
  id: string;
  label: string;
  value: string;
  helper?: string;
  tone: MetricTone;
  tooltip: string;
  updatedAt: string;
}
