import type {
  OptionDataProvider,
  ProviderLoadOptions,
  ProviderMetadata,
} from "@/lib/providers/interfaceProvider";
import type { AnalysisResponse } from "@/types";

const STORAGE_KEY = "xau-terminal:manual-options-analysis";

function readStoredAnalysis(): AnalysisResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisResponse;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveManualAnalysis(analysis: AnalysisResponse): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(analysis));
}

function optionCount(analysis: AnalysisResponse | null): number {
  if (!analysis) return 0;
  return analysis.strike_table.reduce(
    (total, row) =>
      total
      + (row.call_oi > 0 ? 1 : 0)
      + (row.put_oi > 0 ? 1 : 0),
    0,
  );
}

export class ManualOptionsProvider implements OptionDataProvider {
  async load(options?: ProviderLoadOptions): Promise<AnalysisResponse> {
    if (options?.file) {
      throw new Error("O arquivo ainda não foi confirmado no provider manual.");
    }
    const analysis = readStoredAnalysis();
    if (!analysis) {
      throw new Error("Nenhuma importação manual confirmada nesta sessão.");
    }
    return analysis;
  }

  refresh(): Promise<AnalysisResponse> {
    return this.load();
  }

  getMetadata(): ProviderMetadata {
    const analysis = readStoredAnalysis();
    const metadata = analysis?.data_metadata;
    return {
      name: "Manual Options Provider",
      version: "1.0.0",
      type: "manual",
      lastUpdated: metadata?.market_timestamp ?? analysis?.generated_at ?? null,
      lastRefreshAt: metadata?.retrieved_at ?? analysis?.generated_at ?? null,
      origin: metadata?.source ?? "Importação manual não confirmada",
      status: analysis ? "ready" : "unavailable",
      readDurationMs: null,
      strikeCount: analysis?.strike_table.length ?? 0,
      optionCount: optionCount(analysis),
      fallbackUsed: metadata?.fallback_used ?? false,
    };
  }

  async isAvailable(): Promise<boolean> {
    return readStoredAnalysis() !== null;
  }
}
