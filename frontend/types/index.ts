export interface GexStrikeRow {
  strike: number;
  call_gex: number;
  put_gex: number;
  net_gex: number;
  open_interest: number;
  volume: number;
}

export interface OpenInterestSummary {
  call_oi_total: number;
  put_oi_total: number;
  net_oi: number;
  largest_call_oi_strike: number | null;
  largest_put_oi_strike: number | null;
  new_oi_total: number;
  reduced_oi_total: number;
  largest_oi_increase_strike: number | null;
  largest_oi_decrease_strike: number | null;
  max_concentration_pct: number;
  has_previous_open_interest: boolean;
}

export interface OpenInterestStrike {
  rank: number;
  strike: number;
  call_oi: number;
  put_oi: number;
  total_oi: number;
  net_oi: number;
  percentage: number;
}

export interface OpenInterestAnalysis {
  source_name: string;
  source_mode: "demo" | "upload";
  generated_at: string;
  call_oi_total: number;
  put_oi_total: number;
  total_oi: number;
  net_oi: number;
  largest_concentration_strike: number | null;
  largest_concentration_pct: number;
  oi_concentration_score: number;
  top_10_strikes: OpenInterestStrike[];
  distribution_by_strike: OpenInterestStrike[];
}

export interface DealerOpenInterestContext {
  net_oi: number;
  dominant_strike: number | null;
  largest_concentration_pct: number;
  concentration_score: number;
  top_10_share_pct: number;
}

export interface GammaExposureStrike {
  strike: number;
  call_gex: number;
  put_gex: number;
  net_gex: number;
  total_gex: number;
  cumulative_net_gex: number;
  call_oi: number;
  put_oi: number;
  contribution_pct: number;
  dealer_pressure: string;
}

export interface GammaExposureAnalysis {
  source_name: string;
  source_mode: "demo" | "upload";
  generated_at: string;
  call_gex: number;
  put_gex: number;
  net_gex: number;
  total_gex: number;
  largest_positive_gex_strike: number | null;
  largest_positive_gex: number;
  largest_negative_gex_strike: number | null;
  largest_negative_gex: number;
  dealer_pressure: string;
  dealer_pressure_score: number;
  gamma_flip: number | null;
  gamma_magnet: number | null;
  gamma_source: "provided" | "estimated" | "mixed";
  contract_multiplier: number;
  spot_adjusted: boolean;
  curve_by_strike: GammaExposureStrike[];
}

export interface DealerGammaExposureContext {
  net_gex: number;
  total_gex: number;
  dealer_pressure: string;
  dealer_pressure_score: number;
  largest_positive_gex_strike: number | null;
  largest_negative_gex_strike: number | null;
}

export interface VolatilitySummary {
  weighted_iv: number | null;
  call_iv: number | null;
  put_iv: number | null;
  iv_skew: number | null;
  call_skew: number | null;
  put_skew: number | null;
  skew_classification: string | null;
  minimum_iv: number | null;
  maximum_iv: number | null;
  highest_iv_strike: number | null;
  lowest_iv_strike: number | null;
  weighted_iv_change: number | null;
  largest_iv_increase_strike: number | null;
  largest_iv_increase: number | null;
  largest_iv_decrease_strike: number | null;
  largest_iv_decrease: number | null;
  has_iv: boolean;
  has_previous_iv: boolean;
}

export interface ExpectedMove {
  available: boolean;
  reason: string;
  expected_move_points: number | null;
  expected_move_pct: number | null;
  upper_level: number | null;
  lower_level: number | null;
  expiry: string | null;
}

export interface VolatilityCurvePoint {
  strike: number;
  call_iv: number | null;
  put_iv: number | null;
  weighted_iv: number | null;
  expiry: string | null;
}

export interface VolatilityExpiryPoint {
  expiry: string | null;
  call_iv: number | null;
  put_iv: number | null;
  weighted_iv: number | null;
  minimum_iv: number | null;
  maximum_iv: number | null;
}

export interface VolatilityAnalysis {
  source_name: string;
  source_mode: "demo" | "upload";
  generated_at: string;
  volatility_summary: VolatilitySummary;
  expected_move: ExpectedMove;
  volatility_curve: VolatilityCurvePoint[];
  expiry_curve: VolatilityExpiryPoint[];
  iv_rank: null;
  iv_percentile: null;
}

export interface GammaSummaryV2 {
  call_gex_total: number;
  put_gex_total: number;
  net_gex_total: number;
  gross_gex_total: number;
  strongest_positive_gex_strike: number | null;
  strongest_negative_gex_strike: number | null;
  gamma_flip: number | null;
  gamma_magnet: number | null;
  call_wall: number | null;
  put_wall: number | null;
  distance_flip_to_call_wall: number | null;
  distance_flip_to_put_wall: number | null;
  gex_concentration_by_region: {
    below_flip: number;
    at_flip: number;
    above_flip: number;
  };
  regime_strength: string;
}

export interface DealerReportV2 {
  regime: string;
  intensity: string;
  dealer_bias: string;
  expected_hedging: string;
  expected_volatility: string;
  breakout_risk: string;
  reversal_risk: string;
  critical_level_proximity: string;
  institutional_score: number;
  confidence: number;
  critical_level: number | null;
  decision_factors: string[];
  commentary: string;
  educational_action: string;
  open_interest_context: DealerOpenInterestContext | null;
  gamma_exposure_context: DealerGammaExposureContext | null;
}

export interface StrikeTableRow extends GexStrikeRow {
  cumulative_gex: number;
  call_oi: number;
  put_oi: number;
  net_oi: number;
  previous_call_oi: number;
  previous_put_oi: number;
  call_oi_change: number;
  put_oi_change: number;
  concentration_pct: number;
}

export interface DealerReport {
  title: string;
  regime: string;
  explanation: string;
  suggested_action: string;
  risk_statement: string;
  critical_level: number | null;
  educational_notice: string;
}

export interface AnalysisResponse {
  call_wall: number | null;
  put_wall: number | null;
  gamma_flip: number | null;
  gamma_magnet: number | null;
  gex_total: number;
  regime: string;
  dealer_bias: string;
  confidence: number;
  volatility: string;
  risk: string;
  price: number | null;
  price_change_percent: number | null;
  commentary: string;
  decision: string;
  report: DealerReport;
  alerts: string[];
  gex_by_strike: GexStrikeRow[];
  open_interest_summary: OpenInterestSummary;
  open_interest_analysis: OpenInterestAnalysis | null;
  gamma_exposure_analysis: GammaExposureAnalysis | null;
  volatility_analysis: VolatilityAnalysis | null;
  gamma_summary: GammaSummaryV2;
  dealer_report: DealerReportV2;
  strike_table: StrikeTableRow[];
  source_name: string;
  source_mode: "demo" | "upload";
  generated_at: string;
  source_updated_at: string | null;
  source_is_stale: boolean;
  snapshot_id: number | null;
  snapshot_saved_automatically: boolean;
  data_metadata?: DataMetadata | null;
}

export type FreshnessType =
  | "realtime"
  | "delayed"
  | "end_of_day"
  | "historical"
  | "manual"
  | "demo"
  | "unavailable";

export interface DataMetadata {
  provider: string;
  source: string;
  symbol: string;
  retrieved_at: string;
  market_timestamp: string | null;
  delay_minutes: number | null;
  freshness_type: FreshnessType;
  is_demo: boolean;
  is_manual: boolean;
  is_partial: boolean;
  warnings: string[];
  missing_fields: string[];
  status: "ready" | "unavailable" | "error";
  fallback_used: boolean;
}

export interface ProviderStatus extends DataMetadata {
  api_key_configured: boolean;
  last_success: string | null;
  last_error: string | null;
  known_limit: string | null;
  cache_ttl_seconds: number | null;
  capabilities: string[];
}

export interface ProvidersResponse {
  selected_provider: string;
  fallback_enabled: boolean;
  providers: ProviderStatus[];
}

export interface MarketSpotResponse {
  data: {
    price: number;
    currency: string;
    unit: string | null;
  } | null;
  metadata: DataMetadata;
}

export interface MarketOptionContract {
  symbol: string | null;
  expiration: string | null;
  strike: number;
  option_type: "CALL" | "PUT";
  bid: number | null;
  ask: number | null;
  last: number | null;
  volume: number;
  open_interest: number;
  previous_open_interest: number | null;
  implied_volatility: number | null;
  previous_iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  underlying_price: number | null;
  timestamp: string | null;
  source: string | null;
  aggressor: number | null;
  days_to_expiry: number | null;
}

export interface MarketOptionsResponse {
  data: MarketOptionContract[];
  metadata: DataMetadata;
}

export interface ImportIssue {
  row: number;
  field: string;
  message: string;
}

export interface ManualImportResponse {
  imported: boolean;
  report: {
    filename: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    can_import: boolean;
    issues: ImportIssue[];
    warnings: string[];
    missing_fields: string[];
    preview: Record<string, unknown>[];
  };
  metadata: DataMetadata | null;
  analysis: AnalysisResponse | null;
}

export type CmeValidationStatus =
  | "valid"
  | "valid_with_warnings"
  | "partial"
  | "incompatible"
  | "rejected";

export type CmeEligibility =
  | "full_analysis_allowed"
  | "partial_analysis_allowed"
  | "open_interest_only"
  | "blocked";

export interface CmeBulletinContract {
  symbol: string;
  exchange: string;
  product_code: string;
  product_name: string;
  expiration: string | null;
  contract_month: string;
  strike: number;
  option_type: "CALL" | "PUT";
  settlement: number | null;
  volume: number | null;
  open_outcry_volume: number | null;
  globex_volume: number | null;
  pnt_volume: number | null;
  open_interest: number | null;
  open_interest_change: number | null;
  delta: number | null;
  implied_volatility: number | null;
  gamma: number | null;
  underlying_price: number | null;
  market_date: string | null;
  source: string;
  source_page: number;
  source_line: number;
  raw_text: string;
}

export interface CmeValidationReport {
  status: CmeValidationStatus;
  pages_total: number;
  pages_processed: number;
  gold_pages: number[];
  blocks_found: number;
  product_codes: string[];
  calls_found: number;
  puts_found: number;
  expiration_labels: string[];
  expirations_found: string[];
  valid_contracts: number;
  partial_contracts: number;
  ignored_lines: number;
  duplicates: number;
  invalid_strikes: number;
  invalid_open_interest: number;
  invalid_volume: number;
  missing_expiration: number;
  missing_critical_fields: string[];
  failed_pages: number[];
  warnings: string[];
  blocking_errors: string[];
  issues: Array<{
    page: number | null;
    line: number | null;
    field: string;
    message: string;
  }>;
}

export interface CmeEligibilityReport {
  status: CmeEligibility;
  reason: string;
  engines_allowed: string[];
  contracts_with_open_interest: number;
  contracts_with_volume: number;
  contracts_with_gamma: number;
  contracts_with_expiration: number;
  has_calls: boolean;
  has_puts: boolean;
  has_compatible_spot: boolean;
}

export interface CmeSpotAlignment {
  status:
    | "aligned"
    | "acceptable_with_warning"
    | "stale"
    | "incompatible"
    | "unavailable";
  bulletin_date: string | null;
  spot_timestamp: string | null;
  date_difference_days: number | null;
  warning: string | null;
}

export interface CmeBulletinMetadata {
  provider: "cme_bulletin";
  source: string;
  freshness_type: "end_of_day";
  is_manual: true;
  is_demo: false;
  is_partial: boolean;
  bulletin_date: string | null;
  market_timestamp: string | null;
  retrieved_at: string;
  delay_minutes: null;
  warnings: string[];
  missing_fields: string[];
  capabilities: string[];
}

export interface CmeOpenInterestAnalysis {
  call_oi_total: number;
  put_oi_total: number;
  total_oi: number;
  net_oi: number;
  largest_call_oi_strike: number | null;
  largest_put_oi_strike: number | null;
  largest_concentration_strike: number | null;
  largest_concentration_pct: number;
  oi_concentration_score: number;
  top_10_strikes: OpenInterestStrike[];
  distribution_by_strike: OpenInterestStrike[];
}

export interface CmeBulletinPreview {
  preview_id: string;
  expires_at: string;
  filename: string;
  file_hash: string;
  duplicate: boolean;
  duplicate_import_id: number | null;
  metadata: CmeBulletinMetadata;
  report: CmeValidationReport;
  eligibility: CmeEligibilityReport;
  spot_alignment: CmeSpotAlignment;
  sample_contracts: CmeBulletinContract[];
}

export interface CmeBulletinImport {
  id: number;
  filename: string;
  file_hash: string;
  imported_at: string;
  reprocessed: boolean;
  reprocessed_from_id: number | null;
  metadata: CmeBulletinMetadata;
  report: CmeValidationReport;
  eligibility: CmeEligibilityReport;
  spot_alignment: CmeSpotAlignment;
  contract_count: number;
  contracts: CmeBulletinContract[];
  open_interest_analysis: CmeOpenInterestAnalysis | null;
  snapshot_created: false;
}

export interface CmeBulletinConfirmResponse {
  imported: true;
  result: CmeBulletinImport;
}

export interface CmeBulletinLatestResponse {
  available: boolean;
  result: CmeBulletinImport | null;
}

export interface CmeBulletinStatusResponse {
  provider: "cme_bulletin";
  available: boolean;
  preview_count: number;
  preview_ttl_seconds: number;
  max_previews: number;
  max_file_bytes: number;
  max_pages: number;
  max_processing_seconds: number;
  latest_import_id: number | null;
  latest_bulletin_date: string | null;
  freshness_type: "end_of_day";
  is_manual: true;
  legal_notice: string;
}

export interface InstitutionalLevels {
  callWall: number | null;
  putWall: number | null;
  gammaFlip: number | null;
  gammaMagnet: number | null;
}

export type AlertSeverity = "critical" | "warning" | "info" | "success";
export type AlertState = "active" | "monitoring" | "resolved";

export interface MarketAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  state: AlertState;
}

export interface HealthResponse {
  status: "ok";
  name: string;
  version: string;
}

export interface HistoryRecord {
  id: number;
  created_at: string | null;
  call_wall: number | null;
  put_wall: number | null;
  gamma_flip: number | null;
  gamma_magnet: number | null;
  gex_total: number | null;
  regime: string | null;
  dealer_bias: string | null;
  confidence: number | null;
}

export interface SnapshotSummary {
  id: number;
  created_at: string;
  schema_version: number;
  source_name: string;
  source_mode: "demo" | "upload";
  is_automatic: boolean;
  label: string | null;
  call_wall: number | null;
  put_wall: number | null;
  gamma_flip: number | null;
  gamma_magnet: number | null;
  gex_total: number;
  net_oi: number;
  regime: string;
  dealer_bias: string;
  confidence: number;
  institutional_score: number;
  data_metadata?: DataMetadata | null;
}

export interface SnapshotDetail extends SnapshotSummary {
  analysis: AnalysisResponse;
}

export interface SettingsResponse {
  name: string;
  version: string;
  sample_csv_available: boolean;
  history_mode: string;
  scheduler_enabled: boolean;
  realtime_data_enabled: boolean;
}
