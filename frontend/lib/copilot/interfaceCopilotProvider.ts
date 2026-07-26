import type {
  CopilotAnswer,
  CopilotProviderMetadata,
  CopilotRequest,
} from "@/types/copilot";

export interface CopilotProvider {
  answer(request: CopilotRequest): Promise<CopilotAnswer>;
  getMetadata(): CopilotProviderMetadata;
  isAvailable(): Promise<boolean>;
}
