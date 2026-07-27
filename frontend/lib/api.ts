import { API_BASE_URL } from "@/lib/constants";
import { safeErrorMessage } from "@/lib/errors";
import type {
  AnalysisResponse,
  CmeBulletinConfirmResponse,
  CmeBulletinLatestResponse,
  CmeBulletinPreview,
  CmeBulletinStatusResponse,
  CmeInstitutionalSnapshot,
  GammaExposureAnalysis,
  HealthResponse,
  HistoryRecord,
  ManualImportResponse,
  MarketOptionsResponse,
  MarketSpotResponse,
  OpenInterestAnalysis,
  SettingsResponse,
  SnapshotDetail,
  SnapshotSummary,
  VolatilityAnalysis,
  ProvidersResponse,
  InstitutionalDataMode,
  InstitutionalDataState,
  InstitutionalLatestResponse,
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
      message = safeErrorMessage(body.detail, message);
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

export function getProviders(): Promise<ProvidersResponse> {
  return apiRequest<ProvidersResponse>("/providers");
}

export function getProvidersStatus(): Promise<ProvidersResponse> {
  return apiRequest<ProvidersResponse>("/providers/status");
}

export function getMarketSpot(): Promise<MarketSpotResponse> {
  return apiRequest<MarketSpotResponse>("/market/spot");
}

export function getMarketOptions(): Promise<MarketOptionsResponse> {
  return apiRequest<MarketOptionsResponse>("/market/options");
}

export function importManualOptions(
  file: File,
  confirm = false,
): Promise<ManualImportResponse> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<ManualImportResponse>(
    `/market/options/import?confirm=${confirm}`,
    { method: "POST", body },
  );
}

export function previewCmeBulletin(
  file: File,
): Promise<CmeBulletinPreview> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<CmeBulletinPreview>("/market/cme-bulletin/preview", {
    method: "POST",
    body,
  });
}

export function confirmCmeBulletin(
  previewId: string,
  allowReprocess = false,
): Promise<CmeBulletinConfirmResponse> {
  return apiRequest<CmeBulletinConfirmResponse>(
    "/market/cme-bulletin/confirm",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preview_id: previewId,
        allow_reprocess: allowReprocess,
      }),
    },
  );
}

export function getCmeBulletinStatus(): Promise<CmeBulletinStatusResponse> {
  return apiRequest<CmeBulletinStatusResponse>("/market/cme-bulletin/status");
}

export function getLatestCmeBulletin(): Promise<CmeBulletinLatestResponse> {
  return apiRequest<CmeBulletinLatestResponse>("/market/cme-bulletin/latest");
}

export function getInstitutionalStatus(): Promise<InstitutionalDataState> {
  return apiRequest<InstitutionalDataState>("/market/institutional/status");
}

export function getInstitutionalLatest(): Promise<InstitutionalLatestResponse> {
  return apiRequest<InstitutionalLatestResponse>("/market/institutional/latest");
}

export function setInstitutionalMode(
  mode: InstitutionalDataMode,
): Promise<{ updated: boolean; state: InstitutionalDataState }> {
  return apiRequest<{ updated: boolean; state: InstitutionalDataState }>(
    "/market/institutional/mode",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    },
  );
}

export function createCmeInstitutionalSnapshot(): Promise<CmeInstitutionalSnapshot> {
  return apiRequest<CmeInstitutionalSnapshot>("/market/institutional/snapshots", {
    method: "POST",
  });
}

export function getCmeInstitutionalSnapshots(): Promise<CmeInstitutionalSnapshot[]> {
  return apiRequest<CmeInstitutionalSnapshot[]>("/market/institutional/snapshots");
}

export function getCmeInstitutionalSnapshot(
  snapshotId: number,
): Promise<CmeInstitutionalSnapshot> {
  return apiRequest<CmeInstitutionalSnapshot>(
    `/market/institutional/snapshots/${snapshotId}`,
  );
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
