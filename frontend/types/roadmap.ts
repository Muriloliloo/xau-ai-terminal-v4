export const ROADMAP_STATUSES = [
  "concluído",
  "em validação",
  "em desenvolvimento",
  "planejado",
  "futuro",
  "bloqueado",
] as const;

export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export interface RoadmapPhase {
  id: string;
  version: string;
  title: string;
  objective: string;
  status: RoadmapStatus;
  progress: number;
  dependencies: string[];
  deliverables: string[];
  criteria: string[];
  risks?: string[];
  limitations?: string[];
  validationNote?: string;
}

export interface ProductRoadmap {
  product: string;
  subtitle: string;
  mission: string;
  vision: string;
  pillars: string[];
  phases: RoadmapPhase[];
  currentLimitations: string[];
  futureVision: string[];
}
