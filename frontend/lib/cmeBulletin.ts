import type {
  CmeBulletinImport,
  OpenInterestAnalysis,
} from "@/types";

export const CME_BULLETIN_SESSION_KEY = "xau:cme-bulletin:active";
export const CME_BULLETIN_UPDATED_EVENT = "xau:cme-bulletin-updated";

export type CmeBulletinDashboardData = Omit<
  CmeBulletinImport,
  "contracts"
> & {
  contracts: [];
};

export function saveCmeBulletinSession(result: CmeBulletinImport): void {
  if (typeof window === "undefined") return;
  const compact: CmeBulletinDashboardData = {
    ...result,
    contracts: [],
  };
  window.sessionStorage.setItem(
    CME_BULLETIN_SESSION_KEY,
    JSON.stringify(compact),
  );
  window.dispatchEvent(new Event(CME_BULLETIN_UPDATED_EVENT));
}

export function clearCmeBulletinSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CME_BULLETIN_SESSION_KEY);
  window.dispatchEvent(new Event(CME_BULLETIN_UPDATED_EVENT));
}

export function readCmeBulletinSession(): CmeBulletinDashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CME_BULLETIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CmeBulletinDashboardData>;
    if (
      parsed.metadata?.provider !== "cme_bulletin"
      || parsed.metadata.freshness_type !== "end_of_day"
      || typeof parsed.contract_count !== "number"
      || !parsed.report
      || !parsed.eligibility
    ) {
      return null;
    }
    return parsed as CmeBulletinDashboardData;
  } catch {
    return null;
  }
}

export function cmeOpenInterestForChart(
  result: CmeBulletinDashboardData,
): OpenInterestAnalysis | null {
  const analysis = result.open_interest_analysis;
  if (!analysis) return null;
  return {
    source_name: result.metadata.source,
    source_mode: "upload",
    generated_at: result.imported_at,
    call_oi_total: analysis.call_oi_total,
    put_oi_total: analysis.put_oi_total,
    total_oi: analysis.total_oi,
    net_oi: analysis.net_oi,
    largest_concentration_strike:
      analysis.largest_concentration_strike,
    largest_concentration_pct: analysis.largest_concentration_pct,
    oi_concentration_score: analysis.oi_concentration_score,
    top_10_strikes: analysis.top_10_strikes,
    distribution_by_strike: analysis.distribution_by_strike,
  };
}
