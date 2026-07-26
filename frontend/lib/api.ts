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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  return request<HealthResponse>("/health");
}

export function runDemoAnalysis(): Promise<AnalysisResponse> {
  return request<AnalysisResponse>("/analysis/demo", { method: "POST" });
}

export function uploadAnalysis(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<AnalysisResponse>("/analysis/upload", {
    method: "POST",
    body: form,
  });
}

export function getHistory(): Promise<HistoryRecord[]> {
  return request<HistoryRecord[]>("/history");
}

export function getOpenInterest(): Promise<OpenInterestAnalysis> {
  return request<OpenInterestAnalysis>("/open-interest");
}

export function getGex(): Promise<GammaExposureAnalysis> {
  return request<GammaExposureAnalysis>("/gex");
}

export function getVolatility(): Promise<VolatilityAnalysis> {
  return request<VolatilityAnalysis>("/volatility");
}

export function getSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>("/settings");
}

export function getSnapshots(): Promise<SnapshotSummary[]> {
  return request<SnapshotSummary[]>("/snapshots");
}

export function getSnapshot(snapshotId: number): Promise<SnapshotDetail> {
  return request<SnapshotDetail>(`/snapshots/${snapshotId}`);
}

export function createSnapshot(
  analysis: AnalysisResponse,
  label?: string,
): Promise<SnapshotDetail> {
  return request<SnapshotDetail>("/snapshots/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis, label: label || null }),
  });
}

export function deleteSnapshot(snapshotId: number): Promise<void> {
  return request<void>(`/snapshots/${snapshotId}`, { method: "DELETE" });
}
