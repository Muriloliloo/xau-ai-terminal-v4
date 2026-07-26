type ProviderLogLevel = "info" | "error";

type ProviderLogContext = Record<
  string,
  boolean | number | string | null | undefined
>;

function writeLog(
  level: ProviderLogLevel,
  event: string,
  context: ProviderLogContext,
): void {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (level === "error") {
    console.error("[OptionDataProvider]", payload);
    return;
  }

  console.info("[OptionDataProvider]", payload);
}

export const providerLogger = {
  loaded(context: {
    provider: string;
    durationMs: number;
    strikes: number;
    options: number;
    origin: string;
  }): void {
    writeLog("info", "provider_loaded", context);
  },

  fallback(context: {
    requestedProvider: string;
    fallbackProvider: string;
    reason: string;
  }): void {
    writeLog("error", "provider_fallback", context);
  },

  failed(context: { provider: string; reason: string }): void {
    writeLog("error", "provider_failed", context);
  },
};
