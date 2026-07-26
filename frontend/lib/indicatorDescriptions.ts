const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  "Call Wall": "Maior concentração de Open Interest em Calls.",
  "Put Wall": "Maior concentração de Open Interest em Puts.",
  "Gamma Flip":
    "Preço estimado onde o hedge dos dealers pode mudar de direção.",
  "Gamma Magnet":
    "Strike com maior concentração absoluta de exposição líquida de gamma.",
  "Dealer Bias":
    "Indica o comportamento predominante esperado dos Market Makers.",
  "Dealer Pressure":
    "Pressão estrutural estimada do hedge dealer sobre os movimentos do mercado.",
  Confiança: "Nível de confiança calculado pelo engine institucional.",
  Confidence: "Nível de confiança calculado pelo engine institucional.",
  Regime: "Classificação do ambiente predominante de gamma.",
  Risco: "Leitura qualitativa do risco de expansão de volatilidade.",
  "GEX Total": "Exposição líquida de gamma agregada pelo sistema.",
  "GEX bruto": "Soma das exposições absolutas de Calls e Puts.",
  "Call GEX": "Exposição de gamma agregada das opções de compra.",
  "Put GEX": "Exposição de gamma agregada das opções de venda.",
  "Net OI": "Diferença entre o Open Interest de Calls e Puts.",
  "Open Interest total": "Soma do Open Interest válido de Calls e Puts.",
  "Call OI total": "Open Interest agregado das opções de compra.",
  "Put OI total": "Open Interest agregado das opções de venda.",
  "OI Concentration Score":
    "Índice que mede o quanto o Open Interest está concentrado em poucos strikes.",
  "Maior concentração":
    "Strike com maior participação no Open Interest total.",
  "IV ponderada":
    "Volatilidade implícita média ponderada pelo Open Interest.",
  "Call IV": "Volatilidade implícita média das opções de compra.",
  "Put IV": "Volatilidade implícita média das opções de venda.",
  "IV Skew": "Diferença entre a volatilidade implícita de Puts e Calls.",
  "Expected Move":
    "Faixa educacional estimada a partir de spot, IV e prazo até o vencimento.",
  "Score institucional":
    "Score direcional agregado das leituras institucionais disponíveis.",
  Intensidade: "Força qualitativa estimada para o regime atual.",
  "Risco rompimento": "Probabilidade qualitativa de expansão e rompimento.",
  "Risco reversão": "Probabilidade qualitativa de retorno e reversão.",
  Strikes: "Quantidade de níveis de exercício processados na análise.",
};

export function getIndicatorDescription(label: string): string {
  return (
    INDICATOR_DESCRIPTIONS[label] ??
    `Explicação contextual do indicador ${label} na análise institucional atual.`
  );
}

export { INDICATOR_DESCRIPTIONS };
