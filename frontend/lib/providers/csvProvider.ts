import { apiRequest, getHealth } from "@/lib/api";
import type {
  OptionDataProvider,
  ProviderLoadOptions,
  ProviderMetadata,
} from "@/lib/providers/interfaceProvider";
import { providerLogger } from "@/lib/providers/providerLogger";
import type { AnalysisResponse } from "@/types";

const CSV_PROVIDER_VERSION = "1.0.0";
const DEMO_CSV_ORIGIN = "sample_options.csv";

function getClockTime(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function countProcessedOptions(analysis: AnalysisResponse): number {
  return analysis.strike_table.reduce(
    (count, row) =>
      count + Number(row.call_oi > 0) + Number(row.put_oi > 0),
    0,
  );
}

async function loadDemoCsv(): Promise<AnalysisResponse> {
  return apiRequest<AnalysisResponse>("/analysis/demo", { method: "POST" });
}

async function uploadCsv(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);

  return apiRequest<AnalysisResponse>("/analysis/upload", {
    method: "POST",
    body: form,
  });
}

export class CsvProvider implements OptionDataProvider {
  private lastLoadOptions: ProviderLoadOptions = {};

  private metadata: ProviderMetadata = {
    name: "CSV Provider",
    version: CSV_PROVIDER_VERSION,
    type: "csv",
    lastUpdated: null,
    origin: DEMO_CSV_ORIGIN,
    status: "idle",
  };

  async load(options: ProviderLoadOptions = {}): Promise<AnalysisResponse> {
    const startedAt = getClockTime();
    this.lastLoadOptions = options;
    this.metadata = {
      ...this.metadata,
      origin: options.file?.name ?? DEMO_CSV_ORIGIN,
      status: "loading",
    };

    try {
      const analysis = options.file
        ? await uploadCsv(options.file)
        : await loadDemoCsv();
      const durationMs = Math.round((getClockTime() - startedAt) * 100) / 100;

      this.metadata = {
        ...this.metadata,
        lastUpdated:
          analysis.source_updated_at ?? analysis.generated_at ?? new Date().toISOString(),
        origin: analysis.source_name || this.metadata.origin,
        status: "ready",
      };

      providerLogger.loaded({
        provider: this.metadata.name,
        durationMs,
        strikes: analysis.strike_table.length,
        options: countProcessedOptions(analysis),
        origin: this.metadata.origin,
      });

      return analysis;
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Falha desconhecida ao ler CSV.";
      this.metadata = { ...this.metadata, status: "error" };
      providerLogger.failed({ provider: this.metadata.name, reason: message });
      throw reason;
    }
  }

  refresh(): Promise<AnalysisResponse> {
    return this.load(this.lastLoadOptions);
  }

  getMetadata(): ProviderMetadata {
    return { ...this.metadata };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await getHealth();
      if (this.metadata.status === "unavailable") {
        this.metadata = { ...this.metadata, status: "idle" };
      }
      return true;
    } catch {
      this.metadata = { ...this.metadata, status: "unavailable" };
      return false;
    }
  }
}
