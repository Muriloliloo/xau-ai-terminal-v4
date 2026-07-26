import type { AnalysisResponse } from "@/types";

export type OptionProviderType =
  | "auto"
  | "manual"
  | "demo"
  | "alpha_vantage"
  | "csv"
  | "polygon"
  | "tradier"
  | "interactive-brokers"
  | "cme"
  | "dxfeed";

export type ProviderStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "unavailable";

export interface ProviderMetadata {
  name: string;
  version: string;
  type: OptionProviderType;
  lastUpdated: string | null;
  lastRefreshAt: string | null;
  origin: string;
  status: ProviderStatus;
  readDurationMs: number | null;
  strikeCount: number;
  optionCount: number;
  fallbackUsed: boolean;
}

export interface ProviderLoadOptions {
  file?: File;
}

export interface OptionDataProvider {
  load(options?: ProviderLoadOptions): Promise<AnalysisResponse>;
  refresh(): Promise<AnalysisResponse>;
  getMetadata(): ProviderMetadata;
  isAvailable(): Promise<boolean>;
}
