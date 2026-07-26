import { getSnapshot, getSnapshots } from "@/lib/api";
import { generateMarketSummary } from "@/lib/marketSummary";
import { getOptionDataProvider } from "@/lib/providers/providerFactory";
import { sortSnapshotsChronologically } from "@/lib/replay";
import type { AnalysisResponse, SnapshotSummary } from "@/types";
import type { KnowledgeContext } from "@/types/copilot";

const optionDataProvider = getOptionDataProvider();

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildKnowledgeContext(
  analysis: AnalysisResponse,
  snapshots: SnapshotSummary[],
  selectedSnapshotId = analysis.snapshot_id,
): KnowledgeContext {
  const summary = generateMarketSummary(analysis);
  return {
    dealerReport: analysis.dealer_report ?? null,
    replay: sortSnapshotsChronologically(snapshots),
    heatmap: analysis.gamma_exposure_analysis?.curve_by_strike ?? [],
    analytics: {
      confidence: finiteOrNull(analysis.confidence),
      risk: analysis.risk || null,
      volatility: analysis.volatility || null,
      decision: analysis.decision || null,
      institutionalScore: finiteOrNull(
        analysis.dealer_report?.institutional_score,
      ),
      alerts: Array.isArray(analysis.alerts) ? analysis.alerts : [],
      callWall: finiteOrNull(analysis.call_wall),
      putWall: finiteOrNull(analysis.put_wall),
      gammaFlip: finiteOrNull(analysis.gamma_flip),
      gammaMagnet: finiteOrNull(analysis.gamma_magnet),
    },
    aiSummary: {
      marketRegime: summary.marketRegime,
      dealerBias: summary.dealerBias,
      confidence: finiteOrNull(summary.confidence),
      gammaEnvironment: summary.gammaEnvironment,
      callWall: finiteOrNull(summary.callWall),
      putWall: finiteOrNull(summary.putWall),
      gammaFlip: finiteOrNull(summary.gammaFlip),
      analysis: summary.analysis,
      strategy: summary.strategy,
    },
    openInterest: analysis.open_interest_analysis ?? null,
    gex: analysis.gamma_exposure_analysis ?? null,
    gamma: analysis.gamma_summary ?? null,
    volatility: analysis.volatility_analysis ?? null,
    metadata: {
      sourceName: analysis.source_name || null,
      generatedAt: analysis.generated_at || null,
      snapshotId: selectedSnapshotId ?? null,
    },
  };
}

async function snapshotsOrEmpty(): Promise<SnapshotSummary[]> {
  try {
    return await getSnapshots();
  } catch {
    return [];
  }
}

export async function loadCopilotKnowledge(): Promise<KnowledgeContext> {
  const snapshots = await snapshotsOrEmpty();
  const latest = sortSnapshotsChronologically(snapshots).at(-1);

  if (latest) {
    try {
      const snapshot = await getSnapshot(latest.id);
      return buildKnowledgeContext(snapshot.analysis, snapshots, latest.id);
    } catch {
      // Fall through to the configured data provider.
    }
  }

  const analysis = await optionDataProvider.load();
  const updatedSnapshots = await snapshotsOrEmpty();
  return buildKnowledgeContext(analysis, updatedSnapshots);
}

export async function refreshCopilotKnowledge(): Promise<KnowledgeContext> {
  const analysis = await optionDataProvider.refresh();
  const snapshots = await snapshotsOrEmpty();
  return buildKnowledgeContext(analysis, snapshots);
}
