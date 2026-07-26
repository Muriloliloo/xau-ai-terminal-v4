import type { CopilotProvider } from "@/lib/copilot/interfaceCopilotProvider";
import { generateKnowledgeAnswer } from "@/lib/copilot/knowledgeEngine";
import type {
  CopilotAnswer,
  CopilotProviderMetadata,
  CopilotRequest,
} from "@/types/copilot";

const METADATA: CopilotProviderMetadata = {
  id: "knowledge-engine",
  name: "Knowledge Engine",
  version: "1.0",
  type: "knowledge-engine",
  external: false,
};

export class KnowledgeEngineProvider implements CopilotProvider {
  async answer(request: CopilotRequest): Promise<CopilotAnswer> {
    return generateKnowledgeAnswer(request.question, request.context);
  }

  getMetadata(): CopilotProviderMetadata {
    return METADATA;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
