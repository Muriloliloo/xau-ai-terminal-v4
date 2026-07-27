import {
  formatNumber,
  formatPercent,
  formatTimestamp,
} from "@/lib/formatters";
import {
  generateReplayAnalysis,
  sortSnapshotsChronologically,
} from "@/lib/replay";
import type {
  CopilotAnswer,
  CopilotAnswerSection,
  KnowledgeCitation,
  KnowledgeContext,
  KnowledgeIndicator,
} from "@/types/copilot";

const INSUFFICIENT_DATA = "Não há dados suficientes.";

type KnowledgeIntent =
  | "overview"
  | "levels"
  | "gex"
  | "heatmap"
  | "open-interest"
  | "volatility"
  | "replay"
  | "analytics"
  | "sources";

const INTENT_KEYWORDS: Record<KnowledgeIntent, string[]> = {
  overview: [
    "resumo",
    "regime",
    "mercado",
    "dealer",
    "bias",
    "cenario",
    "estrategia",
    "acontecendo",
    "visao",
    "ai summary",
  ],
  levels: [
    "nivel",
    "call wall",
    "put wall",
    "gamma flip",
    "gamma magnet",
    "suporte",
    "resistencia",
    "wall",
  ],
  gex: [
    "gex",
    "gamma",
    "gamma exposure",
    "exposicao gamma",
    "pressao dealer",
  ],
  heatmap: ["heatmap", "mapa", "strike positivo", "strike negativo"],
  "open-interest": [
    "open interest",
    "oi",
    "interesse aberto",
    "concentracao",
  ],
  volatility: [
    "volatilidade",
    "volatility",
    "iv",
    "skew",
    "expected move",
    "movimento esperado",
  ],
  replay: [
    "replay",
    "historico",
    "snapshot",
    "mudou",
    "mudanca",
    "evolucao",
    "compare",
    "comparacao",
  ],
  analytics: [
    "analytics",
    "risco",
    "confianca",
    "score",
    "alerta",
    "decisao",
  ],
  sources: [
    "indicadores disponiveis",
    "dados disponiveis",
    "fontes",
    "quais indicadores",
    "o que voce sabe",
    "dados voce usa",
  ],
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function present(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function detectIntents(question: string): KnowledgeIntent[] {
  const normalized = normalize(question);
  if (!normalized || normalized === "oi" || normalized === "ola") return [];

  return (Object.keys(INTENT_KEYWORDS) as KnowledgeIntent[]).filter((intent) =>
    INTENT_KEYWORDS[intent].some((keyword) => {
      if (keyword.length <= 2) {
        return new RegExp(`(^|\\s)${keyword}(\\s|$)`).test(normalized);
      }
      return normalized.includes(keyword);
    }),
  );
}

function citation(
  indicator: KnowledgeIndicator,
  context: KnowledgeContext,
  detail?: string,
): KnowledgeCitation {
  const source = context.metadata.sourceName
    ? `Fonte: ${context.metadata.sourceName}`
    : "Fonte interna";
  const snapshot =
    context.metadata.snapshotId == null
      ? ""
      : ` · Snapshot #${context.metadata.snapshotId}`;
  const provider = context.metadata.provider
    ? ` · Provider: ${context.metadata.provider}`
    : "";
  const freshness = context.metadata.freshnessType
    ? ` · Atualidade: ${context.metadata.freshnessType}`
    : " · Atualidade não registrada";
  return {
    indicator,
    detail: detail ?? `${source}${provider}${freshness}${snapshot}`,
  };
}

function dataContext(context: KnowledgeContext): string[] {
  const metadata = context.metadata;
  let description: string;

  if (context.cmeBulletin) {
    description = context.cmeBulletin.bulletinDate
      ? `Com base no boletim de fechamento da CME referente a ${context.cmeBulletin.bulletinDate}.`
      : "Com base em boletim de fechamento da CME sem data de mercado identificável.";
  } else if (metadata.isDemo || metadata.freshnessType === "demo") {
    description =
      "Com base em dados demonstrativos; não representam condições de mercado ao vivo.";
  } else if (metadata.isManual || metadata.freshnessType === "manual") {
    description =
      "Com base em importação manual; a atualidade depende do arquivo confirmado.";
  } else if (metadata.freshnessType === "delayed") {
    description =
      metadata.delayMinutes == null
        ? "Com base em dados atrasados; o atraso exato não foi confirmado."
        : `Com base em dados atrasados em aproximadamente ${metadata.delayMinutes} minutos.`;
  } else if (metadata.freshnessType === "realtime") {
    description = "Com base em dados classificados pelo provider como tempo real.";
  } else if (metadata.freshnessType === "historical") {
    description = "Com base em uma série histórica.";
  } else if (metadata.freshnessType === "end_of_day") {
    description = "Com base em dados de fechamento diário.";
  } else {
    description =
      "A atualidade da fonte não está registrada neste snapshot.";
  }

  const facts = [description];
  if (metadata.fallbackUsed) {
    facts.push("O fallback de provider estava ativo nesta análise.");
  }
  if (metadata.missingFields?.length) {
    facts.push(
      `Campos indisponíveis: ${metadata.missingFields.slice(0, 6).join(", ")}.`,
    );
  }
  return facts;
}

function addCitation(
  citations: KnowledgeCitation[],
  next: KnowledgeCitation,
): void {
  if (!citations.some((item) => item.indicator === next.indicator)) {
    citations.push(next);
  }
}

function buildOverview(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const summary = context.aiSummary;
  const report = context.dealerReport;
  const facts: string[] = [];

  if (context.cmeBulletin) {
    const bulletin = context.cmeBulletin;
    facts.push(
      `Boletim CME de fechamento: ${formatNumber(bulletin.contractCount)} contratos de opções de ouro reconhecidos.`,
      `Estrutura: ${formatNumber(bulletin.callsFound)} Calls, ${formatNumber(bulletin.putsFound)} Puts e ${formatNumber(bulletin.expirationCount)} vencimentos com data explícita.`,
      `Cobertura: ${formatNumber(bulletin.contractsWithOpenInterest)} contratos com Open Interest e ${formatNumber(bulletin.contractsWithVolume)} com volume reportado.`,
      `Elegibilidade da análise: ${bulletin.eligibility}.`,
    );
    if (finite(bulletin.putCallOiRatio)) {
      facts.push(`Put/Call OI Ratio: ${formatNumber(bulletin.putCallOiRatio)}.`);
    }
    if (finite(bulletin.volumeTotal)) {
      facts.push(`Volume reportado: ${formatNumber(bulletin.volumeTotal)} contratos.`);
    }
    if (finite(bulletin.callVolumeTotal) || finite(bulletin.putVolumeTotal)) {
      facts.push(
        `Volume por lado: Calls ${formatNumber(bulletin.callVolumeTotal)}, Puts ${formatNumber(bulletin.putVolumeTotal)}.`,
      );
    }
    if (finite(bulletin.dominantCallStrike) || finite(bulletin.dominantPutStrike)) {
      facts.push(
        `Strikes dominantes por OI: Call ${formatNumber(bulletin.dominantCallStrike)}, Put ${formatNumber(bulletin.dominantPutStrike)}.`,
      );
    }
    if (finite(bulletin.oiChange)) {
      facts.push(`Variação líquida de OI reportada: ${formatNumber(bulletin.oiChange)}.`);
    }
    if (present(bulletin.spotProvider)) {
      facts.push(
        `Spot é uma fonte separada (${bulletin.spotProvider}); ele não foi combinado com Gamma ou GEX.`,
      );
    }
    sections.push({ title: "Boletim CME", content: facts });
    addCitation(citations, citation("CME Bulletin", context));
    return;
  }

  if (present(summary?.marketRegime)) {
    facts.push(`Regime no arquivo analisado: ${summary.marketRegime}.`);
  }
  if (present(summary?.dealerBias)) {
    facts.push(`Dealer Bias: ${summary.dealerBias}.`);
  }
  if (finite(summary?.confidence)) {
    facts.push(`Confiança: ${formatPercent(summary.confidence)}.`);
  }
  if (present(summary?.gammaEnvironment)) {
    facts.push(`Ambiente de gamma: ${summary.gammaEnvironment}.`);
  }

  if (facts.length) {
    sections.push({ title: "Leitura do arquivo", content: facts });
    addCitation(citations, citation("AI Summary", context));
  }

  const institutional = [
    ...(summary?.analysis ?? []),
    ...(present(report?.commentary) ? [report.commentary] : []),
  ].filter(present);
  if (institutional.length) {
    sections.push({
      title: "Interpretação institucional",
      content: institutional.slice(0, 4),
    });
    addCitation(citations, citation("Dealer Report", context));
  }

  const strategy = summary?.strategy.filter(present) ?? [];
  if (strategy.length) {
    sections.push({ title: "Estratégia educacional", content: strategy });
    addCitation(citations, citation("AI Summary", context));
  }
}

function buildLevels(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const { analytics } = context;
  const gamma = context.gamma;
  const levels: string[] = [];
  const callWall = finite(gamma?.call_wall)
    ? gamma.call_wall
    : analytics.callWall;
  const putWall = finite(gamma?.put_wall) ? gamma.put_wall : analytics.putWall;
  const gammaFlip = finite(gamma?.gamma_flip)
    ? gamma.gamma_flip
    : analytics.gammaFlip;
  const gammaMagnet = finite(gamma?.gamma_magnet)
    ? gamma.gamma_magnet
    : analytics.gammaMagnet;
  if (
    context.cmeBulletin
    && !finite(callWall)
    && !finite(putWall)
  ) {
    const oi = context.openInterest;
    const largestCall = oi?.top_10_strikes
      .filter((row) => row.call_oi > 0)
      .sort((a, b) => b.call_oi - a.call_oi)[0];
    const largestPut = oi?.top_10_strikes
      .filter((row) => row.put_oi > 0)
      .sort((a, b) => b.put_oi - a.put_oi)[0];
    if (largestCall) {
      levels.push(
        `Maior concentração de Call OI entre os strikes agregados: ${formatNumber(largestCall.strike)}.`,
      );
    }
    if (largestPut) {
      levels.push(
        `Maior concentração de Put OI entre os strikes agregados: ${formatNumber(largestPut.strike)}.`,
      );
    }
  }
  if (finite(callWall)) {
    levels.push(`Call Wall: ${formatNumber(callWall)}.`);
  }
  if (finite(putWall)) {
    levels.push(`Put Wall: ${formatNumber(putWall)}.`);
  }
  if (finite(gammaFlip)) {
    levels.push(`Gamma Flip: ${formatNumber(gammaFlip)}.`);
  }
  if (finite(gammaMagnet)) {
    levels.push(`Gamma Magnet: ${formatNumber(gammaMagnet)}.`);
  }
  if (!levels.length) return;

  sections.push({ title: "Níveis institucionais", content: levels });
  if (gamma) addCitation(citations, citation("Gamma", context));
  if (context.cmeBulletin) {
    addCitation(citations, citation("CME Bulletin", context));
    addCitation(citations, citation("Open Interest", context));
  } else {
    addCitation(citations, citation("Analytics", context));
  }
}

function buildGex(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const gex = context.gex;
  const gamma = context.gamma;
  const facts: string[] = [];
  let usedGamma = false;

  if (finite(gex?.call_gex)) {
    facts.push(`Call GEX bruto: ${formatNumber(gex.call_gex)}.`);
  }
  if (finite(gex?.put_gex)) {
    facts.push(`Put GEX bruto: ${formatNumber(gex.put_gex)}.`);
  }
  if (finite(gex?.net_gex)) {
    facts.push(`Net GEX bruto: ${formatNumber(gex.net_gex)}.`);
  } else if (finite(gamma?.net_gex_total)) {
    facts.push(`Net GEX: ${formatNumber(gamma.net_gex_total)}.`);
    usedGamma = true;
  }
  if (present(gex?.dealer_pressure)) {
    facts.push(`Dealer Pressure: ${gex.dealer_pressure}.`);
  }
  if (finite(gex?.gamma_flip)) {
    facts.push(`Gamma Flip estimado: ${formatNumber(gex.gamma_flip)}.`);
  }
  if (finite(gex?.gamma_magnet)) {
    facts.push(`Gamma Magnet: ${formatNumber(gex.gamma_magnet)}.`);
  }
  if (!facts.length) return;

  if (gex && !gex.spot_adjusted) {
    facts.push(
      "Os valores representam a exposição bruta disponível no arquivo, não GEX monetário ajustado pelo preço spot.",
    );
  }
  sections.push({ title: "Gamma Exposure", content: facts });
  if (gex) addCitation(citations, citation("GEX", context));
  if (usedGamma) addCitation(citations, citation("Gamma", context));
}

function buildHeatmap(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const valid = context.heatmap.filter(
    (row) => finite(row.strike) && finite(row.net_gex),
  );
  if (!valid.length) return;

  const positive = valid.reduce((best, row) =>
    row.net_gex > best.net_gex ? row : best,
  );
  const negative = valid.reduce((best, row) =>
    row.net_gex < best.net_gex ? row : best,
  );
  const facts: string[] = [];

  if (positive.net_gex > 0) {
    facts.push(
      `Maior concentração positiva no mapa: strike ${formatNumber(positive.strike)}, com Net GEX ${formatNumber(positive.net_gex)}.`,
    );
  }
  if (negative.net_gex < 0) {
    facts.push(
      `Maior concentração negativa no mapa: strike ${formatNumber(negative.strike)}, com Net GEX ${formatNumber(negative.net_gex)}.`,
    );
  }
  if (!facts.length) return;

  sections.push({ title: "Mapa por strike", content: facts });
  addCitation(citations, citation("Heatmap", context));
}

function buildOpenInterest(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const oi = context.openInterest;
  if (!oi) return;

  const facts: string[] = [];
  if (finite(oi.call_oi_total)) {
    facts.push(`Call OI: ${formatNumber(oi.call_oi_total)}.`);
  }
  if (finite(oi.put_oi_total)) {
    facts.push(`Put OI: ${formatNumber(oi.put_oi_total)}.`);
  }
  if (finite(oi.net_oi)) {
    facts.push(`Net OI: ${formatNumber(oi.net_oi)}.`);
  }
  if (finite(oi.largest_concentration_strike)) {
    const percentage = finite(oi.largest_concentration_pct)
      ? ` (${formatPercent(oi.largest_concentration_pct)})`
      : "";
    facts.push(
      `Maior concentração: strike ${formatNumber(oi.largest_concentration_strike)}${percentage}.`,
    );
  }
  if (finite(oi.oi_concentration_score)) {
    facts.push(
      `OI Concentration Score: ${formatNumber(oi.oi_concentration_score)}.`,
    );
  }
  if (!facts.length) return;

  sections.push({ title: "Open Interest", content: facts });
  addCitation(citations, citation("Open Interest", context));
}

function buildVolatility(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const volatility = context.volatility;
  const summary = volatility?.volatility_summary;
  if (!volatility || !summary?.has_iv) return;

  const facts: string[] = [];
  if (finite(summary.weighted_iv)) {
    facts.push(`IV ponderada por OI: ${formatPercent(summary.weighted_iv)}.`);
  }
  if (finite(summary.call_iv)) {
    facts.push(`Call IV: ${formatPercent(summary.call_iv)}.`);
  }
  if (finite(summary.put_iv)) {
    facts.push(`Put IV: ${formatPercent(summary.put_iv)}.`);
  }
  if (finite(summary.iv_skew)) {
    facts.push(`IV Skew: ${formatPercent(summary.iv_skew)}.`);
  }
  if (present(summary.skew_classification)) {
    facts.push(`Classificação do skew: ${summary.skew_classification}.`);
  }

  const expected = volatility.expected_move;
  if (
    expected.available
    && finite(expected.expected_move_points)
    && finite(expected.expected_move_pct)
  ) {
    const expiry = present(expected.expiry)
      ? `, para ${expected.expiry}`
      : "";
    facts.push(
      `Expected Move: ${formatNumber(expected.expected_move_points)} pontos (${formatPercent(expected.expected_move_pct)})${expiry}.`,
    );
  } else if (present(expected.reason)) {
    facts.push(`Expected Move indisponível: ${expected.reason}.`);
  }
  if (!facts.length) return;

  sections.push({ title: "Volatilidade", content: facts });
  addCitation(citations, citation("Volatility", context));
}

function buildReplay(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const snapshots = sortSnapshotsChronologically(context.replay);
  if (snapshots.length < 2) return;

  const previous = snapshots.at(-2);
  const current = snapshots.at(-1);
  if (!previous || !current) return;

  sections.push({
    title: `Replay #${previous.id} → #${current.id}`,
    content: generateReplayAnalysis(previous, current),
  });
  addCitation(
    citations,
    citation(
      "Replay",
      context,
      `Snapshots #${previous.id} e #${current.id} · ${formatTimestamp(current.created_at)}`,
    ),
  );
}

function buildAnalytics(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const { analytics } = context;
  const facts: string[] = [];
  if (finite(analytics.confidence)) {
    facts.push(`Confiança: ${formatPercent(analytics.confidence)}.`);
  }
  if (finite(analytics.institutionalScore)) {
    facts.push(
      `Institutional Score: ${formatNumber(analytics.institutionalScore)}.`,
    );
  }
  if (present(analytics.risk)) facts.push(`Risco: ${analytics.risk}.`);
  if (present(analytics.volatility)) {
    facts.push(`Ambiente de volatilidade: ${analytics.volatility}.`);
  }
  if (present(analytics.decision)) {
    facts.push(`Decisão educacional: ${analytics.decision}.`);
  }
  if (analytics.alerts.length) {
    facts.push(...analytics.alerts.filter(present).slice(0, 3));
  }
  if (!facts.length) return;

  sections.push({ title: "Analytics e risco", content: facts });
  addCitation(citations, citation("Analytics", context));
  if (context.dealerReport) {
    addCitation(citations, citation("Dealer Report", context));
  }
}

function buildSources(
  context: KnowledgeContext,
  sections: CopilotAnswerSection[],
  citations: KnowledgeCitation[],
): void {
  const available: KnowledgeIndicator[] = [];
  if (context.dealerReport) available.push("Dealer Report");
  if (context.replay.length) available.push("Replay");
  if (context.heatmap.length) available.push("Heatmap");
  if (
    finite(context.analytics.confidence)
    || present(context.analytics.risk)
  ) {
    available.push("Analytics");
  }
  if (context.aiSummary) available.push("AI Summary");
  if (context.openInterest) available.push("Open Interest");
  if (context.gex) available.push("GEX");
  if (context.gamma) available.push("Gamma");
  if (context.volatility?.volatility_summary.has_iv) {
    available.push("Volatility");
  }
  if (context.cmeBulletin) available.push("CME Bulletin");
  if (!available.length) return;

  sections.push({
    title: "Base de conhecimento disponível",
    content: available.map((indicator) => indicator),
  });
  available.forEach((indicator) =>
    addCitation(citations, citation(indicator, context)),
  );
}

const BUILDERS: Record<
  KnowledgeIntent,
  (
    context: KnowledgeContext,
    sections: CopilotAnswerSection[],
    citations: KnowledgeCitation[],
  ) => void
> = {
  overview: buildOverview,
  levels: buildLevels,
  gex: buildGex,
  heatmap: buildHeatmap,
  "open-interest": buildOpenInterest,
  volatility: buildVolatility,
  replay: buildReplay,
  analytics: buildAnalytics,
  sources: buildSources,
};

export function generateKnowledgeAnswer(
  question: string,
  context: KnowledgeContext,
): CopilotAnswer {
  const intents = detectIntents(question);
  const sections: CopilotAnswerSection[] = [];
  const citations: KnowledgeCitation[] = [];

  if (context.cmeBulletin && normalize(question).includes("gamma")) {
    return {
      status: "insufficient",
      summary: INSUFFICIENT_DATA,
      sections: [
        {
          title: "Limitação da fonte",
          content: [
            "O CME Daily Bulletin importado não fornece Gamma por contrato; Gamma, GEX, Gamma Flip e Dealer Bias baseado em Gamma permanecem indisponíveis.",
          ],
        },
      ],
      citations: [citation("CME Bulletin", context)],
      generatedAt: new Date().toISOString(),
    };
  }

  intents.forEach((intent) => BUILDERS[intent](context, sections, citations));

  if (!sections.length) {
    return {
      status: "insufficient",
      summary: INSUFFICIENT_DATA,
      sections: [],
      citations: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const firstFact = sections[0]?.content[0];
  sections.unshift({
    title: "Contexto dos dados",
    content: dataContext(context),
  });
  return {
    status: "answered",
    summary: firstFact ?? INSUFFICIENT_DATA,
    sections,
    citations,
    generatedAt: new Date().toISOString(),
  };
}

export { INSUFFICIENT_DATA };
