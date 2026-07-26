import type { AnalysisResponse } from "@/types";

export type OptionProviderType =
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
  origin: string;
  status: ProviderStatus;
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
