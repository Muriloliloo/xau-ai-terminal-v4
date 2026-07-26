import type { CopilotProvider } from "@/lib/copilot/interfaceCopilotProvider";
import { KnowledgeEngineProvider } from "@/lib/copilot/knowledgeProvider";

export type CopilotProviderFactory = () => CopilotProvider;

const providers = new Map<string, CopilotProviderFactory>([
  ["knowledge-engine", () => new KnowledgeEngineProvider()],
]);

export function registerCopilotProvider(
  id: string,
  factory: CopilotProviderFactory,
): void {
  providers.set(id.trim().toLowerCase(), factory);
}

export function createCopilotProvider(
  id = "knowledge-engine",
): CopilotProvider {
  const factory = providers.get(id.trim().toLowerCase());
  return factory ? factory() : new KnowledgeEngineProvider();
}

let activeProvider: CopilotProvider | null = null;

export function getCopilotProvider(): CopilotProvider {
  if (!activeProvider) {
    const configured =
      process.env.NEXT_PUBLIC_COPILOT_PROVIDER?.trim().toLowerCase()
      || "knowledge-engine";
    activeProvider = createCopilotProvider(configured);
  }
  return activeProvider;
}
