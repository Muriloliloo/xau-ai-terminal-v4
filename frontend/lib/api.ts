import { API_BASE_URL } from "@/lib/constants";
import type {
  AnalysisResponse,
  GammaExposureAnalysis,
  HealthResponse,
  HistoryRecord,
  OpenInterestAnalysis,
  SettingsResponse,
  SnapshotDetail,
  SnapshotSummary,
  VolatilityAnalysis,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Falha na API (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the stable fallback when the API does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

/**
 * @deprecated Use OptionDataProvider through providerFactory.
 */
export async function runDemoAnalysis(): Promise<AnalysisResponse> {
  const { getOptionDataProvider } = await import(
    "@/lib/providers/providerFactory"
  );
  return getOptionDataProvider().load();
}

/**
 * @deprecated Use OptionDataProvider through providerFactory.
 */
export async function uploadAnalysis(file: File): Promise<AnalysisResponse> {
  const { getOptionDataProvider } = await import(
    "@/lib/providers/providerFactory"
  );
  return getOptionDataProvider().load({ file });
}

export function getHistory(): Promise<HistoryRecord[]> {
  return apiRequest<HistoryRecord[]>("/history");
}

export function getOpenInterest(): Promise<OpenInterestAnalysis> {
  return apiRequest<OpenInterestAnalysis>("/open-interest");
}

export function getGex(): Promise<GammaExposureAnalysis> {
  return apiRequest<GammaExposureAnalysis>("/gex");
}

export function getVolatility(): Promise<VolatilityAnalysis> {
  return apiRequest<VolatilityAnalysis>("/volatility");
}

export function getSettings(): Promise<SettingsResponse> {
  return apiRequest<SettingsResponse>("/settings");
}

export function getSnapshots(): Promise<SnapshotSummary[]> {
  return apiRequest<SnapshotSummary[]>("/snapshots");
}

export function getSnapshot(snapshotId: number): Promise<SnapshotDetail> {
  return apiRequest<SnapshotDetail>(`/snapshots/${snapshotId}`);
}

export function createSnapshot(
  analysis: AnalysisResponse,
  label?: string,
): Promise<SnapshotDetail> {
  return apiRequest<SnapshotDetail>("/snapshots/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis, label: label || null }),
  });
}

export function deleteSnapshot(snapshotId: number): Promise<void> {
  return apiRequest<void>(`/snapshots/${snapshotId}`, { method: "DELETE" });
}
