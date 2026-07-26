import { CsvProvider } from "@/lib/providers/csvProvider";
import type {
  OptionDataProvider,
  OptionProviderType,
  ProviderLoadOptions,
  ProviderMetadata,
} from "@/lib/providers/interfaceProvider";
import { providerLogger } from "@/lib/providers/providerLogger";
import type { AnalysisResponse } from "@/types";

type ProviderFactory = () => OptionDataProvider;

const providerFactories = new Map<OptionProviderType, ProviderFactory>([
  ["csv", () => new CsvProvider()],
]);

class FallbackOptionDataProvider implements OptionDataProvider {
  private activeProvider: OptionDataProvider;
  private lastLoadOptions: ProviderLoadOptions | undefined;
  private fallbackUsed = false;

  constructor(
    private readonly primaryProvider: OptionDataProvider,
    private readonly fallbackProvider: OptionDataProvider,
  ) {
    this.activeProvider = primaryProvider;
  }

  async load(options?: ProviderLoadOptions): Promise<AnalysisResponse> {
    this.lastLoadOptions = options;
    try {
      if (!(await this.primaryProvider.isAvailable())) {
        throw new Error("Provider principal indisponível.");
      }
      const result = await this.primaryProvider.load(options);
      this.activeProvider = this.primaryProvider;
      this.fallbackUsed = false;
      return result;
    } catch (reason) {
      return this.loadFallback(options, reason);
    }
  }

  async refresh(): Promise<AnalysisResponse> {
    if (this.activeProvider === this.fallbackProvider) {
      return this.fallbackProvider.refresh();
    }

    try {
      return await this.primaryProvider.refresh();
    } catch (reason) {
      return this.loadFallback(this.lastLoadOptions, reason);
    }
  }

  getMetadata(): ProviderMetadata {
    return {
      ...this.activeProvider.getMetadata(),
      fallbackUsed: this.fallbackUsed,
    };
  }

  async isAvailable(): Promise<boolean> {
    return (
      (await this.primaryProvider.isAvailable()) ||
      (await this.fallbackProvider.isAvailable())
    );
  }

  private async loadFallback(
    options: ProviderLoadOptions | undefined,
    reason: unknown,
  ): Promise<AnalysisResponse> {
    const primaryMetadata = this.primaryProvider.getMetadata();
    const fallbackMetadata = this.fallbackProvider.getMetadata();
    const message =
      reason instanceof Error ? reason.message : "Falha desconhecida no provider.";

    providerLogger.fallback({
      requestedProvider: primaryMetadata.name,
      fallbackProvider: fallbackMetadata.name,
      reason: message,
    });

    this.activeProvider = this.fallbackProvider;
    this.fallbackUsed = true;
    return this.fallbackProvider.load(options);
  }
}

class ConfiguredFallbackProvider implements OptionDataProvider {
  constructor(
    private readonly provider: OptionDataProvider,
    private readonly requestedType: OptionProviderType,
  ) {}

  load(options?: ProviderLoadOptions): Promise<AnalysisResponse> {
    return this.provider.load(options);
  }

  refresh(): Promise<AnalysisResponse> {
    return this.provider.refresh();
  }

  getMetadata(): ProviderMetadata {
    return {
      ...this.provider.getMetadata(),
      fallbackUsed: true,
      origin: `${this.provider.getMetadata().origin} · fallback de ${this.requestedType}`,
    };
  }

  isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }
}

export function registerOptionDataProvider(
  type: OptionProviderType,
  factory: ProviderFactory,
): void {
  providerFactories.set(type, factory);
}

export function createOptionDataProvider(
  requestedType: OptionProviderType = getConfiguredProviderType(),
): OptionDataProvider {
  const csvFactory = providerFactories.get("csv");
  if (!csvFactory) {
    throw new Error("CSV Provider não registrado.");
  }

  const fallbackProvider = csvFactory();
  if (requestedType === "csv") return fallbackProvider;

  const requestedFactory = providerFactories.get(requestedType);
  if (!requestedFactory) {
    providerLogger.fallback({
      requestedProvider: requestedType,
      fallbackProvider: fallbackProvider.getMetadata().name,
      reason: "Provider ainda não registrado.",
    });
    return new ConfiguredFallbackProvider(fallbackProvider, requestedType);
  }

  return new FallbackOptionDataProvider(
    requestedFactory(),
    fallbackProvider,
  );
}

let providerInstance: OptionDataProvider | null = null;

export function getOptionDataProvider(): OptionDataProvider {
  providerInstance ??= createOptionDataProvider();
  return providerInstance;
}

function getConfiguredProviderType(): OptionProviderType {
  const configured = process.env.NEXT_PUBLIC_OPTION_DATA_PROVIDER
    ?.trim()
    .toLowerCase();
  const supportedTypes: OptionProviderType[] = [
    "csv",
    "polygon",
    "tradier",
    "interactive-brokers",
    "cme",
    "dxfeed",
  ];

  return supportedTypes.includes(configured as OptionProviderType)
    ? (configured as OptionProviderType)
    : "csv";
}
