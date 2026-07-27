import type {
  DealerReportV2,
  GammaExposureAnalysis,
  GammaExposureStrike,
  GammaSummaryV2,
  OpenInterestAnalysis,
  SnapshotSummary,
  VolatilityAnalysis,
} from "@/types";

export const KNOWLEDGE_INDICATORS = [
  "Dealer Report",
  "Replay",
  "Heatmap",
  "Analytics",
  "AI Summary",
  "Open Interest",
  "GEX",
  "Gamma",
  "Volatility",
  "CME Bulletin",
] as const;

export type KnowledgeIndicator = (typeof KNOWLEDGE_INDICATORS)[number];

export interface KnowledgeCitation {
  indicator: KnowledgeIndicator;
  detail: string;
}

export interface CopilotAnswerSection {
  title: string;
  content: string[];
}

export interface CopilotAnswer {
  status: "answered" | "insufficient";
  summary: string;
  sections: CopilotAnswerSection[];
  citations: KnowledgeCitation[];
  generatedAt: string;
}

export interface KnowledgeSummary {
  marketRegime: string;
  dealerBias: string;
  confidence: number | null;
  gammaEnvironment: string;
  callWall: number | null;
  putWall: number | null;
  gammaFlip: number | null;
  analysis: string[];
  strategy: string[];
}

export interface KnowledgeAnalytics {
  confidence: number | null;
  risk: string | null;
  volatility: string | null;
  decision: string | null;
  institutionalScore: number | null;
  alerts: string[];
  callWall: number | null;
  putWall: number | null;
  gammaFlip: number | null;
  gammaMagnet: number | null;
}

export interface KnowledgeCmeBulletin {
  bulletinDate: string | null;
  importedAt: string;
  contractCount: number;
  callsFound: number;
  putsFound: number;
  expirationCount: number;
  contractsWithOpenInterest: number;
  contractsWithVolume: number;
  eligibility: string;
}

export interface KnowledgeContext {
  dealerReport: DealerReportV2 | null;
  replay: SnapshotSummary[];
  heatmap: GammaExposureStrike[];
  analytics: KnowledgeAnalytics;
  aiSummary: KnowledgeSummary | null;
  openInterest: OpenInterestAnalysis | null;
  gex: GammaExposureAnalysis | null;
  gamma: GammaSummaryV2 | null;
  volatility: VolatilityAnalysis | null;
  cmeBulletin: KnowledgeCmeBulletin | null;
  metadata: {
    sourceName: string | null;
    generatedAt: string | null;
    snapshotId: number | null;
    provider: string | null;
    freshnessType: string | null;
    marketTimestamp: string | null;
    delayMinutes: number | null;
    isDemo: boolean;
    isManual: boolean;
    fallbackUsed: boolean;
    warnings: string[];
    missingFields: string[];
  };
}

export interface CopilotRequest {
  question: string;
  context: KnowledgeContext;
}

export interface CopilotProviderMetadata {
  id: string;
  name: string;
  version: string;
  type: "knowledge-engine" | "llm";
  external: boolean;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  answer?: CopilotAnswer;
}

export interface CopilotConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: CopilotMessage[];
}
