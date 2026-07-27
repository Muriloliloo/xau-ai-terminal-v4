import {
  ROADMAP_STATUSES,
  type ProductRoadmap,
  type RoadmapPhase,
  type RoadmapStatus,
} from "@/types/roadmap";

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  "concluído": "Concluído",
  "em validação": "Em validação",
  "em desenvolvimento": "Em desenvolvimento",
  planejado: "Planejado",
  futuro: "Futuro",
  bloqueado: "Bloqueado",
};

export const PRODUCT_ROADMAP: ProductRoadmap = {
  product: "XAU AI TERMINAL",
  subtitle: "Institutional Intelligence Platform",
  mission:
    "Transformar dados complexos do mercado de opções em análises claras, explicáveis e acionáveis para traders.",
  vision:
    "Construir uma plataforma modular de inteligência institucional que preserve a origem dos dados, explique suas limitações e apoie decisões sem prometer resultados.",
  pillars: [
    "Quant Engine",
    "Data Acquisition Layer",
    "Knowledge Engine",
    "Institutional Copilot",
    "Market Replay",
    "Institutional Academy",
    "Market Journal",
  ],
  phases: [
    {
      id: "foundation",
      version: "Foundation · V4",
      title: "Institutional Intelligence Foundation",
      objective:
        "Consolidar análise quantitativa, explicabilidade, educação e replay sobre uma arquitetura web modular.",
      status: "concluído",
      progress: 100,
      dependencies: [],
      deliverables: [
        "Dashboard Institucional e AI Market Summary",
        "Gamma, Gamma Exposure, Dealer, Open Interest e Volatility Engines",
        "Snapshots, Market Replay, Heatmap, Analytics e Histórico",
        "Institutional Academy e Institutional Copilot local",
        "Pesquisa global, Favoritos, Preferências e tela de Sistema",
        "Provider Factory com CSV, Demo e Manual Options Provider",
        "Alpha Vantage Provider implementado e testado com mocks",
        "Metadata, freshness, fallback explícito e cache TTL",
        "Testes automatizados de frontend e backend",
      ],
      criteria: [
        "Rotas e recursos listados disponíveis no código",
        "Contratos atuais preservados",
        "Engines protegidos por regressão e hashes",
        "Lint, tipagem, build e testes automatizados aprovados",
      ],
      risks: [
        "Resultados continuam condicionados à qualidade do arquivo analisado",
        "Confiança institucional atual ainda não possui decomposição auditável",
      ],
      limitations: [
        "Option Chain real automática ainda não está disponível",
        "Engines institucionais dependem de CSV, importação manual ou demo",
        "Spot externo não é injetado automaticamente nos engines",
      ],
    },
    {
      id: "foundation-operations",
      version: "Foundation · Operação",
      title: "Validação de Dados Externos e Deploy",
      objective:
        "Comprovar em ambiente autorizado o provider externo e a disponibilidade operacional dos deploys.",
      status: "em validação",
      progress: 60,
      dependencies: ["foundation"],
      deliverables: [
        "Spot XAU externo disponível quando uma chave backend válida é configurada",
        "Histórico diário por endpoint oficial do provider",
        "Configuração documentada para frontend Vercel e backend Render",
        "Health, metadata e origem efetiva observáveis no Sistema",
      ],
      criteria: [
        "Consulta externa controlada aprovada com chave válida",
        "Latência e freshness reportadas sem promover atraso a tempo real",
        "URLs implantadas verificadas por health check",
        "Nenhuma chave presente no frontend ou no Git",
      ],
      risks: [
        "Limites e disponibilidade do plano gratuito podem mudar",
        "A implantação pode existir fora do repositório sem evidência auditável local",
      ],
      limitations: [
        "Spot não é garantido como tempo real",
        "Nesta auditoria não havia chave válida nem URL Render confirmada",
        "A URL Vercel configurada não foi comprovada como implantação ativa",
      ],
      validationNote:
        "A capacidade técnica existe, mas operação externa e deploy não são marcados como concluídos sem evidência verificável.",
    },
    {
      id: "v5-institutional-data",
      version: "V5.0",
      title: "Institutional Data",
      objective:
        "Alimentar os engines com cadeias de opções legítimas, validadas, rastreáveis e reproduzíveis.",
      status: "em desenvolvimento",
      progress: 25,
      dependencies: ["foundation", "foundation-operations"],
      deliverables: [
        "Importador profissional de Option Chain",
        "Parser universal e mapeamento assistido de colunas",
        "Suporte a diferentes layouts e proteção contra arquivo incompatível",
        "Normalização, preview, confirmação e relatório de erros",
        "Histórico e comparação de importações",
        "Identificação da fonte e controle de freshness",
        "Vínculo explícito entre spot e Option Chain",
      ],
      criteria: [
        "Arquivo válido processado integralmente",
        "Arquivo inválido não altera o estado",
        "Metadata e fonte preservadas no snapshot",
        "Engines recebem somente dados validados",
        "Resultado reproduzível e testes automatizados aprovados",
      ],
      risks: [
        "Layouts proprietários variam por corretora e plataforma",
        "Licenças podem restringir automação ou redistribuição",
      ],
      limitations: [
        "O importador atual já valida CSV, mas ainda não é um parser universal",
        "Não existe histórico dedicado de arquivos importados",
      ],
    },
    {
      id: "v5-market-data-validator",
      version: "V5.2",
      title: "Market Data Validator",
      objective:
        "Classificar consistência, compatibilidade e suficiência antes de executar qualquer engine.",
      status: "planejado",
      progress: 0,
      dependencies: ["v5-institutional-data"],
      deliverables: [
        "Validação de ativo, spot, timestamp, vencimento e strikes",
        "Identificação consistente de Calls e Puts",
        "Validação de OI, volume, Gamma e IV",
        "Detecção de contratos duplicados e strikes ausentes",
        "Divergência entre spot da cadeia e spot externo",
        "Freshness, quantidade mínima e campos críticos",
        "Classificações: válido, válido com avisos, parcial, incompatível e rejeitado",
      ],
      criteria: [
        "Nenhum valor ausente substituído silenciosamente por zero",
        "Falha crítica bloqueia execução",
        "Avisos e razões de classificação são auditáveis",
        "Casos extremos possuem testes determinísticos",
      ],
      risks: [
        "Regras rígidas demais podem rejeitar exportações legítimas",
        "Tolerâncias dependem do ativo e da fonte",
      ],
      limitations: [
        "Thresholds quantitativos ainda exigem especificação e calibração",
      ],
    },
    {
      id: "v5-confidence-engine",
      version: "V5.5",
      title: "Confidence Engine",
      objective:
        "Transformar confiança em uma métrica explicável, versionada e auditável.",
      status: "planejado",
      progress: 0,
      dependencies: ["v5-market-data-validator"],
      deliverables: [
        "Contrato conceitual de percentual e classificação",
        "Fatores positivos e negativos",
        "Dados ausentes, divergências e penalidades",
        "Qualidade da fonte, freshness, liquidez e concentração",
        "Comparação histórica quando suficiente",
        "Fonte dos dados e versão da fórmula",
      ],
      criteria: [
        "Cada ponto da confiança possui explicação",
        "Penalidades e ausências ficam visíveis",
        "Fórmula versionada e validada contra dataset independente",
        "Nenhuma promessa de resultado financeiro",
      ],
      risks: [
        "Precisão aparente pode exceder a evidência disponível",
        "Pesos sem calibração podem introduzir viés",
      ],
      limitations: [
        "A fórmula definitiva não faz parte deste roadmap implementado",
      ],
    },
    {
      id: "v5-copilot-v2",
      version: "V5.7",
      title: "Institutional Copilot V2",
      objective:
        "Aprofundar explicações usando dados validados, provenance e comparação histórica.",
      status: "planejado",
      progress: 0,
      dependencies: ["v5-market-data-validator", "v5-confidence-engine"],
      deliverables: [
        "Análise de risco, níveis e divergências",
        "Comparação automática com snapshot anterior",
        "Confirmação ou divergência de volatilidade",
        "Inventário de dados ausentes",
        "Identificação de dados reais, manuais ou demonstrativos",
        "Plano operacional estruturado e educacional",
        "Citações de indicadores, provider, origem, freshness, horário, warnings e limitações",
      ],
      criteria: [
        "Toda afirmação factual cita a base interna utilizada",
        "Dados inexistentes geram resposta insuficiente",
        "Freshness e limitações acompanham a resposta",
        "Saída não constitui promessa nem recomendação garantida",
      ],
      risks: [
        "Texto pode amplificar limitações de dados insuficientes",
        "LLM futuro exigirá avaliação, custo e guardrails próprios",
      ],
      limitations: [
        "O Copilot atual é determinístico e não usa LLM externo",
      ],
    },
    {
      id: "v6-closed-beta",
      version: "V6.0",
      title: "Closed Beta",
      objective:
        "Disponibilizar a plataforma com segurança para grupos controlados e mensurar utilidade real.",
      status: "planejado",
      progress: 0,
      dependencies: ["v5-copilot-v2", "foundation-operations"],
      deliverables: [
        "Autenticação, perfis e isolamento de dados",
        "Termos, privacidade, aviso de risco e onboarding",
        "Telemetria, feedback, erros e monitoramento",
        "Limites de uso, backup e persistência operacional",
        "Controle de versões dos engines",
        "Fases: beta interno de 5, fechado de 20 e ampliado de 100 usuários",
        "Métricas de uso, importação, descoberta, erro, retenção e feedback",
      ],
      criteria: [
        "Segurança e isolamento revisados",
        "Backup e restauração exercitados",
        "Telemetria respeita privacidade e consentimento",
        "Critérios de avanço entre grupos definidos por evidência",
      ],
      risks: [
        "Dados financeiros e pessoais elevam requisitos de segurança",
        "Crescimento antes da observabilidade pode esconder falhas",
      ],
      limitations: [
        "Não há compromisso de data para abertura da beta",
      ],
    },
    {
      id: "v6-market-journal",
      version: "V6.5",
      title: "Market Journal",
      objective:
        "Registrar contexto, hipótese, decisão e resultado para aprendizado histórico estruturado.",
      status: "futuro",
      progress: 0,
      dependencies: ["v6-closed-beta"],
      deliverables: [
        "Registro de ativo, spot, provider, chain, snapshot e regime",
        "GEX, Gamma Flip, walls, volatilidade e AI Summary",
        "Plano, observações, operação, resultado, evidências e tags",
        "Pesquisa por regime, rompimentos, defesa de walls e confiança",
        "Comparação entre plano e resultado",
        "Análise de desempenho por regime",
      ],
      criteria: [
        "Registros possuem provenance e vínculo imutável com snapshot",
        "Usuário controla edição e privacidade das observações",
        "Pesquisas não confundem correlação com causalidade",
        "Exportação e retenção possuem regras explícitas",
      ],
      risks: [
        "Viés retrospectivo pode distorcer aprendizado",
        "Resultados operacionais exigem proteção e consentimento",
      ],
      limitations: [
        "Escopo depende da infraestrutura multiusuário da V6.0",
      ],
    },
  ],
  currentLimitations: [
    "Option Chain real automática ainda indisponível.",
    "Engines institucionais dependem de CSV, importação manual ou demo.",
    "Spot externo é opcional, separado dos engines e não garantido como tempo real.",
    "Alpha Vantage com chave real e deploys externos ainda precisam de validação operacional verificável.",
    "Confiança atual é heurística e ainda não possui decomposição versionada.",
    "Não existem autenticação, isolamento multiusuário ou Market Journal.",
    "O roadmap não define datas rígidas sem confirmação.",
  ],
  futureVision: [
    "Múltiplos ativos: SPX, SPY, ES, NQ, GC, CL e BTC",
    "Múltiplos providers licenciados",
    "Alertas e scanner institucional",
    "API pública e aplicativo mobile",
    "Compartilhamento, equipes e workspaces",
    "Backtesting com metodologia versionada",
    "Morning Institutional Brief",
    "Relatórios exportáveis",
  ],
};

export function validateProductRoadmap(
  phases: RoadmapPhase[] = PRODUCT_ROADMAP.phases,
): string[] {
  const errors: string[] = [];
  const ids = new Set(phases.map((phase) => phase.id));

  phases.forEach((phase) => {
    if (!ROADMAP_STATUSES.includes(phase.status)) {
      errors.push(`${phase.id}: status inválido.`);
    }
    if (
      !Number.isFinite(phase.progress)
      || phase.progress < 0
      || phase.progress > 100
    ) {
      errors.push(`${phase.id}: progresso deve estar entre 0 e 100.`);
    }
    if (phase.status === "concluído" && phase.progress !== 100) {
      errors.push(`${phase.id}: fase concluída deve declarar 100%.`);
    }
    if (phase.progress === 100 && phase.status !== "concluído") {
      errors.push(`${phase.id}: somente fase concluída pode declarar 100%.`);
    }
    phase.dependencies.forEach((dependency) => {
      if (!ids.has(dependency)) {
        errors.push(`${phase.id}: dependência ${dependency} não encontrada.`);
      }
    });
  });

  if (ids.size !== phases.length) {
    errors.push("IDs de fase devem ser únicos.");
  }
  return errors;
}

export function phaseById(id: string): RoadmapPhase | undefined {
  return PRODUCT_ROADMAP.phases.find((phase) => phase.id === id);
}
