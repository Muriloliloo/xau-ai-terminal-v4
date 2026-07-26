export type AcademyCategory =
  | "Gamma"
  | "Dealer"
  | "Open Interest"
  | "Volatilidade"
  | "Estrutura";

export type AcademyTone =
  | "positive"
  | "negative"
  | "accent"
  | "warning"
  | "neutral";

export interface AcademyVisualExample {
  label: string;
  value: string;
  context: string;
  tone: AcademyTone;
}

export interface AcademyLesson {
  id: string;
  title: string;
  category: AcademyCategory;
  whatIs: string;
  interpretation: string;
  observe: string[];
  limitations: string[];
  combineWith: string[];
  example: AcademyVisualExample;
}

export interface PracticalScenario {
  id: string;
  title: string;
  signal: string;
  interpretation: string;
  observe: string;
  tone: AcademyTone;
}

function defineLesson(lesson: AcademyLesson): AcademyLesson {
  return lesson;
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  defineLesson({
    id: "regime",
    title: "Regime",
    category: "Gamma",
    whatIs:
      "Classificação estrutural que resume se o ambiente calculado está em Long Gamma ou Short Gamma.",
    interpretation:
      "Long Gamma costuma ser associado a movimentos mais contidos; Short Gamma sugere maior sensibilidade e possibilidade de expansão.",
    observe: ["Mudanças entre snapshots", "Força do regime", "Posição relativa ao Gamma Flip"],
    limitations: [
      "É uma leitura educacional do snapshot e não confirma direção futura ou volatilidade realizada.",
    ],
    combineWith: ["Gamma Flip", "Dealer Bias", "Confiança"],
    example: {
      label: "Regime hipotético",
      value: "LONG GAMMA",
      context: "Estrutura potencialmente mais estabilizadora.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "dealer-bias",
    title: "Dealer Bias",
    category: "Dealer",
    whatIs:
      "Leitura do comportamento predominante esperado dos Market Makers com base na estrutura disponível.",
    interpretation:
      "Bullish aponta inclinação positiva, Bearish inclinação negativa e Neutral ausência de predominância clara.",
    observe: ["Persistência entre análises", "Concordância com o regime", "Nível crítico do Dealer Report"],
    limitations: [
      "Não representa posicionamento observado em tempo real nem recomendação operacional.",
    ],
    combineWith: ["Regime", "Dealer Pressure", "Score institucional"],
    example: {
      label: "Bias hipotético",
      value: "BULLISH",
      context: "Confirmar com gamma, walls e confiança.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "confidence",
    title: "Confiança",
    category: "Dealer",
    whatIs:
      "Nível de confiança heurístico atribuído pelo engine institucional à leitura atual.",
    interpretation:
      "Valores maiores indicam maior concordância entre os fatores usados; não significam probabilidade garantida de acerto.",
    observe: ["Variação do score", "Quantidade de fatores convergentes", "Qualidade dos dados do arquivo"],
    limitations: [
      "É uma medida interna de consistência, não uma probabilidade estatística calibrada.",
    ],
    combineWith: ["Score institucional", "Regime", "Risco"],
    example: {
      label: "Confiança hipotética",
      value: "82%",
      context: "Alta concordância entre sinais do snapshot.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "risk",
    title: "Risco",
    category: "Dealer",
    whatIs:
      "Classificação qualitativa do ambiente de risco e da possibilidade de expansão de volatilidade.",
    interpretation:
      "Risco elevado pede maior cautela; risco controlado descreve somente a estrutura, não elimina movimentos adversos.",
    observe: ["Mudança de regime", "Dealer Pressure", "Risco de rompimento"],
    limitations: [
      "Não substitui gestão de risco, preço em tempo real ou análise de liquidez.",
    ],
    combineWith: ["Risco rompimento", "Risco reversão", "IV ponderada"],
    example: {
      label: "Risco hipotético",
      value: "ELEVADO",
      context: "Estrutura mais sensível a deslocamentos.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "gex-total",
    title: "GEX Total",
    category: "Gamma",
    whatIs:
      "Exposição líquida de gamma agregada pelo cálculo atualmente disponível no sistema.",
    interpretation:
      "Sinal positivo favorece leitura Long Gamma; sinal negativo favorece leitura Short Gamma.",
    observe: ["Sinal", "Magnitude relativa", "Evolução entre snapshots"],
    limitations: [
      "Com os dados atuais, não deve ser tratado como GEX monetário real de mercado.",
    ],
    combineWith: ["Call GEX", "Put GEX", "Regime"],
    example: {
      label: "Net GEX hipotético",
      value: "+1.24M",
      context: "Exposição líquida positiva no arquivo analisado.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "call-wall",
    title: "Call Wall",
    category: "Open Interest",
    whatIs: "Strike com a maior concentração de Open Interest em Calls.",
    interpretation:
      "Pode atuar como referência de resistência ou região de concentração, dependendo do regime e do preço.",
    observe: ["Distância para o preço", "Migração entre snapshots", "Concentração percentual"],
    limitations: [
      "Uma concentração de OI não garante rejeição do preço nem revela o lado efetivo dos participantes.",
    ],
    combineWith: ["Put Wall", "Gamma Flip", "Call OI total"],
    example: {
      label: "Call Wall hipotética",
      value: "2.450",
      context: "Acima do preço: possível referência de resistência.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "put-wall",
    title: "Put Wall",
    category: "Open Interest",
    whatIs: "Strike com a maior concentração de Open Interest em Puts.",
    interpretation:
      "Pode atuar como referência de suporte ou região defensiva, conforme regime e posição do preço.",
    observe: ["Distância para o preço", "Persistência do strike", "Mudanças no Put OI"],
    limitations: [
      "Não garante suporte e não identifica sozinho compra, venda ou intenção dos participantes.",
    ],
    combineWith: ["Call Wall", "Gamma Flip", "Put OI total"],
    example: {
      label: "Put Wall hipotética",
      value: "2.375",
      context: "Abaixo do preço: possível referência de suporte.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "gamma-flip",
    title: "Gamma Flip",
    category: "Gamma",
    whatIs:
      "Nível estimado onde a leitura de hedge dealer pode mudar de comportamento.",
    interpretation:
      "Acima e abaixo desse nível, o ambiente pode assumir características distintas de estabilização ou amplificação.",
    observe: ["Proximidade do preço", "Cruzamentos", "Concordância com o Net GEX"],
    limitations: [
      "É uma estimativa baseada na estrutura disponível e não um Gamma Flip real observado em mercado.",
    ],
    combineWith: ["Regime", "Call Wall", "Put Wall"],
    example: {
      label: "Gamma Flip hipotético",
      value: "2.410",
      context: "Referência de transição entre ambientes.",
      tone: "warning",
    },
  }),
  defineLesson({
    id: "gamma-magnet",
    title: "Gamma Magnet",
    category: "Gamma",
    whatIs:
      "Strike com maior Net GEX em valor absoluto dentro do perfil analisado.",
    interpretation:
      "Pode funcionar como referência de atração ou concentração, especialmente quando há estabilidade estrutural.",
    observe: ["Distância para o preço", "Magnitude", "Migração ao longo do tempo"],
    limitations: [
      "Não implica que o preço necessariamente convergirá para o strike.",
    ],
    combineWith: ["Maior Net GEX", "Regime", "Gamma Flip"],
    example: {
      label: "Magnet hipotético",
      value: "2.425",
      context: "Maior concentração líquida por strike.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "largest-net-gex",
    title: "Maior Net GEX",
    category: "Gamma",
    whatIs:
      "Strike cuja exposição líquida de gamma apresenta a maior magnitude no perfil.",
    interpretation:
      "Ajuda a localizar onde a pressão estrutural de gamma está mais concentrada.",
    observe: ["Sinal do strike", "Magnitude versus total", "Mudanças na liderança"],
    limitations: [
      "Concentração isolada não descreve todo o perfil nem garante reação de preço.",
    ],
    combineWith: ["Gamma Magnet", "GEX Total", "Dealer Pressure"],
    example: {
      label: "Strike dominante",
      value: "2.425",
      context: "Net GEX hipotético: +420K.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "institutional-score",
    title: "Score institucional",
    category: "Dealer",
    whatIs:
      "Score direcional agregado que sintetiza os fatores institucionais disponíveis.",
    interpretation:
      "Valores acima da zona neutra indicam inclinação long; abaixo dela indicam inclinação short.",
    observe: ["Distância de 50", "Fatores da decisão", "Consistência entre snapshots"],
    limitations: [
      "É heurístico e educacional; não foi calibrado como probabilidade de retorno.",
    ],
    combineWith: ["Dealer Bias", "Confiança", "Intensidade"],
    example: {
      label: "Score hipotético",
      value: "72 / 100",
      context: "Inclinação institucional positiva.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "intensity",
    title: "Intensidade",
    category: "Dealer",
    whatIs: "Classificação qualitativa da força do regime institucional.",
    interpretation:
      "Uma intensidade forte indica maior concentração dos fatores na mesma direção; fraca pede leitura mais cautelosa.",
    observe: ["Regime strength", "Confiança", "Mudanças rápidas de classificação"],
    limitations: [
      "Não mede momentum de preço nem intensidade de fluxo em tempo real.",
    ],
    combineWith: ["Regime", "Score institucional", "Confiança"],
    example: {
      label: "Intensidade hipotética",
      value: "FORTE",
      context: "Fatores estruturais mais alinhados.",
      tone: "warning",
    },
  }),
  defineLesson({
    id: "breakout-risk",
    title: "Risco rompimento",
    category: "Dealer",
    whatIs:
      "Estimativa qualitativa da sensibilidade do ambiente a movimentos de rompimento.",
    interpretation:
      "Risco alto sugere menor capacidade estrutural de conter deslocamentos; não confirma que haverá breakout.",
    observe: ["Short Gamma", "Pressão amplificadora", "Proximidade de níveis críticos"],
    limitations: [
      "Não incorpora confirmação técnica, volume em tempo real ou gatilho de preço.",
    ],
    combineWith: ["Regime", "Dealer Pressure", "Risco"],
    example: {
      label: "Rompimento hipotético",
      value: "ALTO",
      context: "Estrutura potencialmente amplificadora.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "reversal-risk",
    title: "Risco reversão",
    category: "Dealer",
    whatIs:
      "Estimativa qualitativa da propensão estrutural a movimentos de retorno e reversão.",
    interpretation:
      "Risco alto de reversão pode favorecer comportamento de mean reversion, sobretudo em Long Gamma.",
    observe: ["Long Gamma", "Walls próximas", "Estabilidade do Gamma Magnet"],
    limitations: [
      "Não determina ponto de entrada, direção nem extensão de uma reversão.",
    ],
    combineWith: ["Regime", "Gamma Magnet", "Call Wall"],
    example: {
      label: "Reversão hipotética",
      value: "ALTA",
      context: "Ambiente mais favorável a contenção.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "call-oi-total",
    title: "Call OI total",
    category: "Open Interest",
    whatIs: "Soma do Open Interest válido das Calls no arquivo analisado.",
    interpretation:
      "Mostra a presença estrutural de Calls, mas não informa se foram compradas ou vendidas.",
    observe: ["Comparação com Put OI", "Mudança entre snapshots", "Distribuição por strike"],
    limitations: [
      "OI não revela direção, agressor, custo ou intenção do participante.",
    ],
    combineWith: ["Put OI total", "Net OI", "Call Wall"],
    example: {
      label: "Call OI hipotético",
      value: "18.4K",
      context: "Open Interest agregado de Calls.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "put-oi-total",
    title: "Put OI total",
    category: "Open Interest",
    whatIs: "Soma do Open Interest válido das Puts no arquivo analisado.",
    interpretation:
      "Mostra a presença estrutural de Puts sem revelar se representam proteção, especulação ou venda.",
    observe: ["Comparação com Call OI", "Mudança entre snapshots", "Distribuição por strike"],
    limitations: [
      "OI não revela direção, agressor, custo ou intenção do participante.",
    ],
    combineWith: ["Call OI total", "Net OI", "Put Wall"],
    example: {
      label: "Put OI hipotético",
      value: "15.1K",
      context: "Open Interest agregado de Puts.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "open-interest-total",
    title: "Open Interest total",
    category: "Open Interest",
    whatIs: "Soma do Open Interest válido de Calls e Puts.",
    interpretation:
      "Ajuda a dimensionar a quantidade de contratos abertos representada pelo arquivo.",
    observe: ["Crescimento ou redução", "Cobertura do arquivo", "Concentração por strike"],
    limitations: [
      "Não é liquidez disponível e não informa direção dos posicionamentos.",
    ],
    combineWith: ["Net OI", "OI Concentration Score", "Strikes"],
    example: {
      label: "OI total hipotético",
      value: "33.5K",
      context: "Calls + Puts no snapshot.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "new-open-interest",
    title: "OI novo",
    category: "Open Interest",
    whatIs:
      "Soma das variações positivas de Open Interest identificadas quando o arquivo oferece valores anteriores.",
    interpretation:
      "Ajuda a localizar crescimento de contratos abertos entre as referências disponíveis.",
    observe: ["Presença de previous_open_interest", "Strikes com maior aumento", "Concentração do crescimento"],
    limitations: [
      "Sem valores anteriores válidos, não existe base suficiente para classificar OI como novo.",
    ],
    combineWith: ["Open Interest total", "Net OI", "Maior concentração"],
    example: {
      label: "OI novo hipotético",
      value: "+1.8K",
      context: "Crescimento agregado versus referência anterior.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "net-oi",
    title: "Net OI",
    category: "Open Interest",
    whatIs: "Diferença entre Call OI e Put OI.",
    interpretation:
      "Valor positivo indica mais OI de Calls; negativo indica mais OI de Puts no conjunto analisado.",
    observe: ["Sinal", "Magnitude relativa", "Mudança entre snapshots"],
    limitations: [
      "Mais Calls ou Puts não equivale automaticamente a visão bullish ou bearish.",
    ],
    combineWith: ["Call OI total", "Put OI total", "Dealer Bias"],
    example: {
      label: "Net OI hipotético",
      value: "+3.3K",
      context: "Mais OI de Calls que de Puts.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "largest-concentration",
    title: "Maior concentração",
    category: "Open Interest",
    whatIs:
      "Strike com a maior participação percentual no Open Interest total.",
    interpretation:
      "Destaca o nível em que os contratos abertos estão mais concentrados.",
    observe: ["Percentual do strike", "Tipo dominante", "Persistência temporal"],
    limitations: [
      "Concentração elevada não garante defesa, suporte ou resistência.",
    ],
    combineWith: ["OI Concentration Score", "Call Wall", "Put Wall"],
    example: {
      label: "Concentração hipotética",
      value: "2.400 · 18%",
      context: "Maior participação individual no OI.",
      tone: "warning",
    },
  }),
  defineLesson({
    id: "oi-concentration-score",
    title: "OI Concentration Score",
    category: "Open Interest",
    whatIs:
      "Índice HHI normalizado que mede o quanto o OI está concentrado em poucos strikes.",
    interpretation:
      "Valores maiores indicam estrutura mais concentrada; menores indicam distribuição mais dispersa.",
    observe: ["Evolução do score", "Top 10 strikes", "Strike dominante"],
    limitations: [
      "O score mede distribuição, não qualidade, direção ou liquidez do OI.",
    ],
    combineWith: ["Maior concentração", "Open Interest total", "Gamma Magnet"],
    example: {
      label: "Score hipotético",
      value: "24 / 100",
      context: "Distribuição relativamente dispersa.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "weighted-iv",
    title: "IV ponderada",
    category: "Volatilidade",
    whatIs:
      "Média da volatilidade implícita válida ponderada pelo Open Interest.",
    interpretation:
      "Resume o nível de IV do arquivo dando maior peso aos contratos com mais OI.",
    observe: ["Mudança versus previous_iv", "Diferença entre Calls e Puts", "Vencimento"],
    limitations: [
      "É calculada somente com o arquivo; IV Rank e IV Percentile exigem histórico e não estão disponíveis.",
    ],
    combineWith: ["Call IV", "Put IV", "Expected Move"],
    example: {
      label: "IV ponderada hipotética",
      value: "24.8%",
      context: "Média ponderada pelo OI.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "call-iv",
    title: "Call IV",
    category: "Volatilidade",
    whatIs: "Média das volatilidades implícitas válidas das Calls.",
    interpretation:
      "Ajuda a comparar o prêmio relativo de volatilidade das Calls com o das Puts.",
    observe: ["Curva por strike", "Diferença para Put IV", "Múltiplos vencimentos"],
    limitations: [
      "Uma média pode esconder diferenças importantes entre strikes e vencimentos.",
    ],
    combineWith: ["Put IV", "IV Skew", "IV ponderada"],
    example: {
      label: "Call IV hipotética",
      value: "23.6%",
      context: "Média das Calls válidas.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "put-iv",
    title: "Put IV",
    category: "Volatilidade",
    whatIs: "Média das volatilidades implícitas válidas das Puts.",
    interpretation:
      "Ajuda a avaliar o prêmio relativo de volatilidade das Puts no arquivo.",
    observe: ["Curva por strike", "Diferença para Call IV", "Vencimentos"],
    limitations: [
      "Uma média pode esconder diferenças importantes entre strikes e vencimentos.",
    ],
    combineWith: ["Call IV", "IV Skew", "IV ponderada"],
    example: {
      label: "Put IV hipotética",
      value: "26.1%",
      context: "Média das Puts válidas.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "iv-skew",
    title: "IV Skew",
    category: "Volatilidade",
    whatIs: "Diferença entre Put IV e Call IV.",
    interpretation:
      "Skew positivo indica Puts relativamente mais caras; negativo indica Calls relativamente mais caras.",
    observe: ["Sinal", "Magnitude em pontos percentuais", "Formato do smile"],
    limitations: [
      "Sem histórico, não é possível afirmar se o skew está extremo em termos estatísticos.",
    ],
    combineWith: ["Call IV", "Put IV", "Volatility Smile"],
    example: {
      label: "Skew hipotético",
      value: "+2.5 p.p.",
      context: "Puts com IV média superior.",
      tone: "warning",
    },
  }),
  defineLesson({
    id: "expected-move",
    title: "Expected Move",
    category: "Volatilidade",
    whatIs:
      "Faixa educacional calculada com spot, IV e prazo até o vencimento quando esses dados existem.",
    interpretation:
      "Mostra uma amplitude teórica ao redor do spot, sem indicar direção.",
    observe: ["Disponibilidade do spot", "IV usada", "Prazo e vencimento"],
    limitations: [
      "Não é previsão, alvo ou intervalo garantido; fica indisponível quando faltam dados válidos.",
    ],
    combineWith: ["IV ponderada", "Risco", "Gamma Flip"],
    example: {
      label: "Expected Move hipotético",
      value: "± 32 pts",
      context: "Exemplo educacional com todos os inputs válidos.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "call-gex",
    title: "Call GEX",
    category: "Gamma",
    whatIs: "Exposição de gamma agregada das Calls no cálculo disponível.",
    interpretation:
      "Ajuda a observar a contribuição das Calls para o perfil estrutural de gamma.",
    observe: ["Strike positivo dominante", "Magnitude versus Put GEX", "Curva por strike"],
    limitations: [
      "Não representa exposição monetária real quando faltam inputs de mercado completos.",
    ],
    combineWith: ["Put GEX", "GEX bruto", "GEX Total"],
    example: {
      label: "Call GEX hipotético",
      value: "+2.1M",
      context: "Contribuição agregada das Calls.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "put-gex",
    title: "Put GEX",
    category: "Gamma",
    whatIs:
      "Exposição de gamma agregada das Puts, usando a convenção de sinal do engine.",
    interpretation:
      "Ajuda a observar a contribuição negativa das Puts no perfil estrutural.",
    observe: ["Strike negativo dominante", "Magnitude versus Call GEX", "Curva por strike"],
    limitations: [
      "A convenção de sinal é analítica e não revela a posição real de cada participante.",
    ],
    combineWith: ["Call GEX", "GEX bruto", "GEX Total"],
    example: {
      label: "Put GEX hipotético",
      value: "-1.4M",
      context: "Contribuição agregada das Puts.",
      tone: "negative",
    },
  }),
  defineLesson({
    id: "gross-gex",
    title: "GEX bruto",
    category: "Gamma",
    whatIs: "Soma das magnitudes absolutas de Call GEX e Put GEX.",
    interpretation:
      "Dimensiona a exposição total antes da compensação entre contribuições positivas e negativas.",
    observe: ["Relação com Net GEX", "Concentração por strike", "Mudanças entre snapshots"],
    limitations: [
      "Magnitude bruta não indica direção e não deve ser tratada como valor monetário real.",
    ],
    combineWith: ["Call GEX", "Put GEX", "Dealer Pressure"],
    example: {
      label: "GEX bruto hipotético",
      value: "3.5M",
      context: "|Call GEX| + |Put GEX|.",
      tone: "accent",
    },
  }),
  defineLesson({
    id: "dealer-pressure",
    title: "Dealer Pressure",
    category: "Dealer",
    whatIs:
      "Classificação da pressão estrutural estimada do hedge dealer sobre movimentos de preço.",
    interpretation:
      "Suppressive sugere contenção; Amplifying sugere potencial de amplificação; Neutral indica equilíbrio.",
    observe: ["Pressure score", "Regime", "Maior GEX positivo e negativo"],
    limitations: [
      "Não observa hedge executado, fluxo intradiário ou inventário real dos dealers.",
    ],
    combineWith: ["Regime", "GEX bruto", "Risco rompimento"],
    example: {
      label: "Pressão hipotética",
      value: "SUPPRESSIVE",
      context: "Estrutura potencialmente estabilizadora.",
      tone: "positive",
    },
  }),
  defineLesson({
    id: "strikes",
    title: "Strikes",
    category: "Estrutura",
    whatIs: "Quantidade de níveis de exercício processados na análise.",
    interpretation:
      "Ajuda a entender a cobertura estrutural do arquivo e a densidade do perfil.",
    observe: ["Amplitude entre menor e maior strike", "Lacunas", "Cobertura por vencimento"],
    limitations: [
      "Mais strikes não significa dados melhores; qualidade e representatividade continuam essenciais.",
    ],
    combineWith: ["Open Interest total", "OI Concentration Score", "Volatility Smile"],
    example: {
      label: "Cobertura hipotética",
      value: "24 strikes",
      context: "Níveis válidos processados no snapshot.",
      tone: "neutral",
    },
  }),
];

export const PRACTICAL_SCENARIOS: PracticalScenario[] = [
  {
    id: "long-gamma",
    title: "LONG GAMMA",
    signal: "Net GEX positivo e pressão mais supressiva",
    interpretation:
      "Movimentos podem encontrar maior contenção e apresentar comportamento de reversão.",
    observe: "Gamma Flip, walls, confiança e mudanças entre snapshots.",
    tone: "positive",
  },
  {
    id: "short-gamma",
    title: "SHORT GAMMA",
    signal: "Net GEX negativo e pressão mais amplificadora",
    interpretation:
      "O mercado pode ficar mais sensível e movimentos direcionais podem se expandir.",
    observe: "Risco de rompimento, níveis críticos e alteração do Dealer Bias.",
    tone: "negative",
  },
  {
    id: "dealer-bullish",
    title: "Dealer Bias Bullish",
    signal: "Fatores institucionais inclinados para o lado positivo",
    interpretation:
      "A estrutura favorece uma leitura positiva, desde que regime e confiança confirmem.",
    observe: "Score institucional, Regime e distância para a Call Wall.",
    tone: "positive",
  },
  {
    id: "dealer-bearish",
    title: "Dealer Bias Bearish",
    signal: "Fatores institucionais inclinados para o lado negativo",
    interpretation:
      "A estrutura favorece cautela e maior atenção à pressão vendedora potencial.",
    observe: "Put Wall, Short Gamma, risco de rompimento e confiança.",
    tone: "negative",
  },
  {
    id: "call-wall-above",
    title: "Call Wall acima do preço",
    signal: "Maior Call OI localizado acima do spot válido",
    interpretation:
      "O strike pode funcionar como referência de resistência ou concentração.",
    observe: "Distância, migração da wall e regime; não assumir rejeição automática.",
    tone: "warning",
  },
  {
    id: "put-wall-below",
    title: "Put Wall abaixo do preço",
    signal: "Maior Put OI localizado abaixo do spot válido",
    interpretation:
      "O strike pode funcionar como referência de suporte ou defesa estrutural.",
    observe: "Distância, persistência do OI e Gamma Flip; não assumir suporte garantido.",
    tone: "accent",
  },
];

const INDICATOR_ALIASES: Record<string, string> = {
  "Market Regime": "regime",
  "Gamma Environment": "regime",
  Confidence: "confidence",
  "Confiança do regime": "confidence",
  "Volatility Smile": "iv-skew",
  Rompimento: "breakout-risk",
  Reversão: "reversal-risk",
  "Net GEX": "gex-total",
  "OI novo": "new-open-interest",
  Concentração: "largest-concentration",
  "OI Score": "oi-concentration-score",
};

const LESSONS_BY_ID = new Map(
  ACADEMY_LESSONS.map((lesson) => [lesson.id, lesson]),
);

const LESSONS_BY_TITLE = new Map(
  ACADEMY_LESSONS.map((lesson) => [lesson.title.toLowerCase(), lesson]),
);

export function getAcademyLessonById(
  lessonId: string | null | undefined,
): AcademyLesson | null {
  return lessonId ? (LESSONS_BY_ID.get(lessonId) ?? null) : null;
}

export function getAcademyLessonForIndicator(
  indicatorLabel: string,
): AcademyLesson | null {
  const aliasId = INDICATOR_ALIASES[indicatorLabel];
  if (aliasId) return getAcademyLessonById(aliasId);
  return LESSONS_BY_TITLE.get(indicatorLabel.toLowerCase()) ?? null;
}
