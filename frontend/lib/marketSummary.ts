import type { AnalysisResponse } from "@/types";

export type MarketDirection = "bullish" | "bearish" | "neutral";
export type GammaEnvironment = "long" | "short" | "neutral";
export type SummaryTone = "positive" | "negative" | "warning" | "neutral";

export interface ConvictionLevel {
  stars: "★★★★★" | "★★★★☆" | "★★★☆☆";
  label: "Alta Convicção" | "Convicção Moderada" | "Baixa Convicção";
  tone: SummaryTone;
}

export interface MarketSummary {
  marketRegime: string;
  dealerBias: string;
  confidence: number;
  gammaEnvironment: string;
  callWall: number | null;
  putWall: number | null;
  gammaFlip: number | null;
  conviction: ConvictionLevel;
  regimeTone: SummaryTone;
  analysis: string[];
  strategy: string[];
}

const levelFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatLevel(value: number | null): string {
  return value == null || !Number.isFinite(value)
    ? "indisponível"
    : levelFormatter.format(value);
}

function gammaEnvironment(data: AnalysisResponse): GammaEnvironment {
  const gamma = `${data.gamma_summary.regime_strength} ${data.regime}`.toUpperCase();
  if (gamma.includes("LONG GAMMA")) return "long";
  if (gamma.includes("SHORT GAMMA")) return "short";
  return "neutral";
}

function marketDirection(data: AnalysisResponse): MarketDirection {
  const bias = `${data.dealer_bias} ${data.dealer_report.dealer_bias}`.toUpperCase();
  if (
    bias.includes("BULLISH")
    || bias.includes("COMPRADOR")
    || bias.includes("ALTA")
  ) {
    return "bullish";
  }
  if (
    bias.includes("BEARISH")
    || bias.includes("VENDEDOR")
    || bias.includes("BAIXA")
  ) {
    return "bearish";
  }
  return "neutral";
}

function convictionLevel(confidence: number): ConvictionLevel {
  if (confidence > 80) {
    return {
      stars: "★★★★★",
      label: "Alta Convicção",
      tone: "positive",
    };
  }
  if (confidence >= 60) {
    return {
      stars: "★★★★☆",
      label: "Convicção Moderada",
      tone: "warning",
    };
  }
  return {
    stars: "★★★☆☆",
    label: "Baixa Convicção",
    tone: "neutral",
  };
}

function regimeTone(environment: GammaEnvironment): SummaryTone {
  if (environment === "long") return "positive";
  if (environment === "short") return "negative";
  return "warning";
}

export function generateInstitutionalAnalysis(
  data: AnalysisResponse,
): string[] {
  const environment = gammaEnvironment(data);
  const bias = data.dealer_bias.toUpperCase();
  const analysis: string[] = [];

  if (environment === "long") {
    analysis.push(
      "Os dealers permanecem comprados em gama. Esse ambiente normalmente reduz a volatilidade e favorece movimentos de reversão.",
    );
  } else if (environment === "short") {
    analysis.push(
      "Os dealers permanecem vendidos em gama. Esse ambiente pode amplificar deslocamentos e elevar a sensibilidade a rompimentos.",
    );
  } else {
    analysis.push(
      "O ambiente de gama permanece neutro ou em transição. A estrutura exige confirmação antes de assumir reversão ou continuidade.",
    );
  }

  if (bias.includes("REVERTER")) {
    analysis.push(
      "O Dealer Bias indica atuação contrária à extensão dos movimentos.",
    );
  } else if (bias.includes("AMPLIFICAR")) {
    analysis.push(
      "O Dealer Bias indica atuação favorável à extensão dos movimentos.",
    );
  } else if (marketDirection(data) === "bullish") {
    analysis.push("O Dealer Bias apresenta inclinação compradora.");
  } else if (marketDirection(data) === "bearish") {
    analysis.push("O Dealer Bias apresenta inclinação vendedora.");
  } else {
    analysis.push("O Dealer Bias não apresenta direção definida.");
  }

  if (data.call_wall != null) {
    analysis.push(
      `A concentração de Calls em ${formatLevel(data.call_wall)} atua como resistência estrutural.`,
    );
  }
  if (data.put_wall != null) {
    analysis.push(
      `A concentração de Puts em ${formatLevel(data.put_wall)} funciona como suporte estrutural.`,
    );
  }
  if (data.gamma_flip != null) {
    analysis.push(
      environment === "long"
        ? `Acima do Gamma Flip estimado em ${formatLevel(data.gamma_flip)}, a estrutura tende a favorecer menor expansão de volatilidade.`
        : environment === "short"
          ? `Ao redor do Gamma Flip estimado em ${formatLevel(data.gamma_flip)}, mudanças de regime podem acelerar a volatilidade.`
          : `O Gamma Flip estimado em ${formatLevel(data.gamma_flip)} permanece como nível de transição a monitorar.`,
    );
  }

  return analysis;
}

export function generateStrategy(data: AnalysisResponse): string[] {
  const environment = gammaEnvironment(data);
  const direction = marketDirection(data);
  const bias = data.dealer_bias.toUpperCase();

  if (
    environment === "long"
    && (direction === "bullish" || bias.includes("REVERTER"))
  ) {
    return [
      "Buscar reversões.",
      "Evitar perseguir rompimentos.",
      "Volatilidade tende a permanecer controlada.",
    ];
  }

  if (
    environment === "short"
    && (direction === "bearish" || bias.includes("AMPLIFICAR"))
  ) {
    return [
      "Cuidado com movimentos explosivos.",
      "Mercado mais sensível.",
      "Breakouts possuem maior probabilidade.",
    ];
  }

  if (environment === "long") {
    return [
      "Priorizar confirmação em movimentos de reversão.",
      "Evitar extensão sem validação nos níveis institucionais.",
      "Volatilidade tende a permanecer mais controlada.",
    ];
  }

  if (environment === "short") {
    return [
      "Monitorar rompimentos com atenção redobrada.",
      "Movimentos podem ganhar velocidade.",
      "Exigir gestão de risco mais conservadora.",
    ];
  }

  return [
    "Aguardar definição do regime.",
    "Monitorar o Gamma Flip estimado.",
    "Exigir confirmação antes de assumir direção.",
  ];
}

export function generateMarketSummary(
  data: AnalysisResponse,
): MarketSummary {
  const environment = gammaEnvironment(data);
  return {
    marketRegime: data.regime,
    dealerBias: data.dealer_bias,
    confidence: data.confidence,
    gammaEnvironment: data.gamma_summary.regime_strength,
    callWall: data.call_wall,
    putWall: data.put_wall,
    gammaFlip: data.gamma_flip,
    conviction: convictionLevel(data.confidence),
    regimeTone: regimeTone(environment),
    analysis: generateInstitutionalAnalysis(data),
    strategy: generateStrategy(data),
  };
}
