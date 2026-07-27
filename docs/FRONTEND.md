# Frontend Next.js — Dashboard 4.0

## Stack

- Next.js App Router;
- React;
- TypeScript strict;
- Tailwind CSS;
- ESLint.

O projeto segue a configuração oficial atual: Tailwind via
`@tailwindcss/postcss` e `@import "tailwindcss"`.

## CME Daily Bulletin

O painel Sistema oferece importação manual do PDF CME Section 64 em duas
etapas (preview e confirmação). A interface identifica `CME EOD`, fechamento
diário, fonte manual, elegibilidade e campos ausentes. Após a confirmação,
somente componentes compatíveis com os dados são atualizados; Gamma/GEX e spot
continuam indisponíveis quando o boletim não os fornece.

Depois de `Confirmar importação`, o cliente grava a sessão compacta e emite o
evento `xau:cme-bulletin-updated`. Dashboard, Analytics, Heatmap, Replay e
Copilot usam esse evento para refazer suas consultas sem recarregar a página.
O Dashboard mostra o selo `🟢 CME REAL DATA`; o System consulta
`/api/provider/current` e exibe data, totais e `snapshot_id`. O Replay lê a
trilha `cme_institutional_snapshots` criada automaticamente na confirmação.

## Rotas

| Rota | Função |
|---|---|
| `/` | Dashboard institucional completo |
| `/institutional` | Upload CSV e execução demo |
| `/heatmap` | Mapa GEX e curva de Gamma do snapshot |
| `/analytics` | Métricas agregadas e perfil |
| `/history` | Histórico SQLite e estado vazio |
| `/snapshots` | Lista, exclusão e comparação de snapshots |
| `/snapshots/[id]` | Dashboard reconstruído do snapshot salvo |
| `/settings` | Capacidades retornadas pela API |
| `/system` | saúde, providers, cache, fallback e importação manual |
| `/roadmap` | evolução declarativa Foundation, V5 e V6 |

## Design system

### Cores

| Token | Valor |
|---|---|
| background | `#050b14` |
| sidebar | `#07101d` |
| card | `#0b1726` |
| secondary panel | `#0e1d30` |
| border | `#1f3854` |
| text | `#eef5ff` |
| muted | `#91a4bd` |
| positive | `#45d267` |
| negative | `#ff414d` |
| accent | `#5f9cff` |
| gamma flip | `#f4d438` |

Tokens estão definidos em `app/globals.css` com `@theme`.

### Componentes

- `AppShell`: layout e offset da sidebar;
- `Sidebar`: navegação fixa desktop e compacta mobile;
- `Header`: contexto das páginas auxiliares;
- `MarketHeader`: ativo, preço, variação, saúde, origem, refresh e salvamento;
- `MetricCard`: métricas compactas;
- `StatusBadge`: estados;
- `ConfidenceBar`: confiança;
- `InstitutionalReport`: Dealer Report estruturado com risco e aviso educacional;
- `GexProfile`: PUT à esquerda, zero central e CALL à direita;
- `GexMap`: concentração, pressão e níveis institucionais por strike;
- `GammaCurve`: curva Net GEX com Gamma Flip e Gamma Magnet;
- `VolatilitySmile`: linhas Call/Put IV por strike e vencimento;
- `OpenInterestDistribution`: Top 10 com barras Call/Put e percentual;
- `StrikeTable`: tabela ordenada com cabeçalho fixo;
- `AlertCard` e `AlertPanel`: severidade, horário e estado dos alertas;
- `DashboardSkeleton` e `ErrorState`: loading, falha e retry.
- `SnapshotsWorkspace`: listagem cronológica, seleção e comparação.
- `RoadmapWorkspace`: missão, pilares, timeline e limitações do produto.
- `RoadmapPhase`, `RoadmapProgress`, `RoadmapMilestone` e
  `RoadmapDependency`: composição tipada e reutilizável do roadmap.

## Composição do dashboard

```text
MarketHeader
├── Linha 1: Regime, Dealer Bias, Confiança, Risco, GEX Total
├── Linha 2: Call Wall, Put Wall, Gamma Flip, Gamma Magnet, Maior Net GEX
├── Bloco GEX: Call, Put, bruto, Dealer Pressure + curva
├── Bloco IV: IV ponderada, Call/Put, skew, Expected Move + smile
├── InstitutionalReport
├── GexProfile + GexMap
└── StrikeTable + AlertPanel
```

Os cards têm 102 px de altura e usam cor somente no valor principal. O perfil,
mapa GEX, tabela e alertas possuem alturas internas limitadas para preservar
leitura em 1366×768.

## Responsividade

- desktop: sidebar fixa de 240px;
- mobile/tablet: navegação horizontal sticky;
- cards: duas colunas em telas pequenas e cinco em telas largas;
- charts: uma coluna antes de `xl`;
- mapa GEX: até quatro colunas em desktop;
- tabelas: scroll horizontal sem sobreposição;
- página: `overflow-x` bloqueado, com scroll apenas nos componentes que precisam;
- tipografia e barras permanecem compactas.

QA executado:

- 1366×768: dez cards com 102 px, sem truncamento ou overflow;
- 768×900: sidebar desktop oculta e navegação móvel ativa;
- ambos: largura do documento igual à largura útil e console sem warnings/erros.

## Dados

`lib/api.ts` é o único cliente HTTP. Não existem valores financeiros mockados.

- Dashboard chama `/analysis/demo`;
- Institucional chama `/analysis/demo` ou `/analysis/upload`;
- Mapa GEX e Analytics usam o snapshot demo real;
- Histórico chama `/history`;
- Snapshots usa `/snapshots` para CRUD e reconstrução;
- Settings chama `/settings`.
- System chama `/providers/status` e oferece preview/confirm em
  `/market/options/import`.
- Dashboard consulta `/market/spot`; o resultado é exibido separadamente da
  cadeia usada pelos engines.
- o dashboard recebe `open_interest_analysis` junto da análise;

`price: null` aparece como indisponível até existir spot legítimo. Um arquivo
manual pode preencher `underlying_price`; o spot Alpha Vantage é mostrado com
provider e freshness próprios, sem ser injetado nos engines.

O contrato também fornece:

- `price_change_percent`, atualmente `null`;
- `source_name` e `source_mode`;
- `generated_at` e `source_updated_at`;
- `source_is_stale`;
- `report`, com todo o texto do Dealer Report produzido pela API.
- `open_interest_analysis`, com Top 10, distribuição e score HHI.
- `gamma_exposure_analysis`, com totais, pressão e curva completa por strike.
- `volatility_analysis`, com resumo IV, Expected Move e curvas.

O dashboard acrescenta quatro cards de OI, quatro cards GEX, a distribuição OI,
a curva de Gamma, cinco cards IV, Volatility Smile e o mapa GEX sem alterar o
shell ou a sidebar.

O Volatility Smile seleciona o primeiro vencimento disponível, usa strike no
eixo X, Call IV em verde e Put IV em vermelho. Possui altura máxima de 320 px,
tooltips nos pontos e estado explícito quando há menos de dois strikes válidos.

O aviso abaixo do gráfico registra que IV Rank e IV Percentile dependem de
histórico e ainda não estão disponíveis. Snapshots antigos exibem “—” nos cards
e o estado insuficiente no gráfico.

`lib/useRemoteResource.ts` centraliza carregamento, retry e erros sem duplicar
efeitos React. `lib/alerts.ts` transforma somente dados reais da resposta em
estados visuais; a ausência de histórico de regime é declarada, não inferida.

## Estados

- loading: skeleton animado;
- error: mensagem estável e botão de retry;
- empty: estados específicos para upload e histórico;
- ready: componentes renderizados com resposta do backend.

Dados `source_mode: demo` exibem aviso explícito. Falha de saúde/análise mostra
API indisponível, alerta crítico e botão para tentar novamente.

O MarketHeader usa `data_metadata` para os badges exatos de tempo real
confirmado, atraso, fechamento, histórico, manual, demonstração e
indisponibilidade. Também mostra horário de mercado, coleta, provider, origem e
fallback. Snapshots legados sem metadata usam estado neutro.

A tela Sistema nunca mostra o valor da chave: apresenta somente
configurada/ausente, capacidades, último sucesso, erro sanitizado, limite
conhecido e TTL. A importação manual guarda a análise confirmada em
`sessionStorage` para o provider do Dashboard; arquivo bruto não é persistido no
navegador.

O botão `Atualizar` refaz health e análise em paralelo. A validação integrada
confirmou novo horário de snapshot e manutenção do estado “API conectada”.

O botão `Salvar Snapshot` cria uma cópia manual. Análises normais já retornam o
id do snapshot automático. A rota dinâmica reutiliza `Dashboard`, passando os
dados persistidos em vez de executar uma nova análise.

## Execução

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Validação

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

O quality gate cobre providers, fallback, regras do Market Summary, Replay,
comparação, formatação pt-BR, persistência validada, erros seguros e contratos
responsivos. Também valida status, progresso, dependências, rota, navegação,
pesquisa, campos opcionais e semântica do Product Roadmap. A Academy carrega
conteúdo e overlays sob demanda, reduzindo o JavaScript compartilhado pelas
rotas que não usam o módulo educacional.
# Sprint 13 no frontend

Dashboard, Analytics, mapa e Copilot consultam `InstitutionalDataState`. Em CME EOD o mapa muda para Open Interest por strike e painéis Gamma/GEX exibem indisponibilidade explícita. Sistema permite alternar o modo persistido, e Snapshots/Replay usam a trilha CME dedicada.
