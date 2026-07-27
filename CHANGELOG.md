# Changelog

Todas as mudanças conhecidas do XAU AI TERMINAL são registradas neste arquivo.

O formato segue os princípios de Keep a Changelog. O projeto ainda está em fase
Alpha e não adota releases estáveis.

## [Unreleased]

### Sprint 13 — CME Bulletin como provider oficial

- confirmação de preview CME agora publica o resultado no `CmeBulletinProvider`
  global e ativa o modo institucional `real_eod`;
- snapshot institucional CME gerado automaticamente e de forma idempotente,
  preservando a trilha dedicada do Replay e sem duplicar snapshots legados;
- criado `GET /api/provider/current` com origem `cme_pdf`, data, totais e
  snapshot atual;
- provider CME priorizado pela factory para cadeias de opções após confirmação,
  sem fallback demo silencioso e sem inventar Gamma/GEX/spot;
- Dashboard/System exibem `CME REAL DATA`, metadados e snapshot gerado;
- confirmação dispara atualização de Dashboard, Analytics, Heatmap, Replay e
  Copilot via evento de invalidação no frontend;
- nenhum engine protegido, fórmula, contrato público anterior ou layout-base
  foi removido.

### Sprint 12 — CME Daily Bulletin Importer

- adicionado fluxo manual `preview -> confirm` para PDFs locais da CME Section
  64, com SHA-256, TTL, limite de páginas/tamanho, sanitização e deduplicação;
- parser textual coordenado extrai blocos de ouro `OG/OG1/OG2/OG4/OG5 CALL/PUT`,
  settlement, volume, Open Interest, mudança de OI, Delta e rastreabilidade por
  página/linha, preservando campos ausentes como `null`;
- criado `CmeBulletinProvider` com metadata `end_of_day`/manual, persistência
  auditável e gate que limita o boletim de referência a `open_interest_only`;
- adicionados endpoints `/api/market/cme-bulletin/{preview,confirm,status,latest}`
  e testes com PDF real, fixtures mínimas, corrupção, limites, duplicidade,
  alinhamento de spot e compatibilidade de snapshots;
- nenhum scraping/download automático foi implementado; Gamma, Dealer, Open
  Interest, Snapshot Engines e fórmulas protegidas permanecem inalterados.

### Product Roadmap — V5 e V6

- criado `docs/PRODUCT_ROADMAP.md` com missão, visão, sete pilares, fases,
  dependências, entregas, critérios, riscos e limitações;
- criada a rota `/roadmap` com timeline institucional, progresso declarativo e
  status acessíveis em desktop, tablet e mobile;
- adicionados tipos e fonte central de dados do roadmap, sem datas ou
  funcionalidades futuras codificadas como existentes;
- Foundation V4 foi separada da validação operacional de Alpha Vantage com
  chave real e dos deploys Vercel/Render;
- Option Chain automática, tempo real garantido e capacidades futuras
  permanecem explicitamente indisponíveis ou planejadas;
- Sidebar e pesquisa global passaram a oferecer acesso ao Roadmap;
- adicionados testes de schema, status, progresso, dependências, rota,
  navegação, campos opcionais, responsividade e acessibilidade;
- nenhuma API, provider, engine protegido ou cálculo institucional foi
  modificado.

### Sprint 11 — Real Data Foundation

- criada camada backend de providers com contratos normalizados, registry,
  factory, erros públicos estáveis e cache TTL thread-safe;
- adicionados Alpha Vantage opcional, Manual Options, CSV autorizado e Demo
  Provider, com fallback sempre identificado;
- Alpha Vantage passou a suportar spot de ouro/XAU e histórico diário pelos
  endpoints oficiais, sem rotular dados como tempo real sem garantia;
- criada importação manual em duas etapas, com validação estrita, prévia,
  relatório e confirmação antes de executar engines/salvar snapshot;
- adicionados endpoints internos de providers, spot, histórico, opções,
  metadata e importação;
- respostas de análise e snapshots ganharam `data_metadata` opcional, mantendo
  compatibilidade com registros antigos e sem migração SQLite;
- Dashboard, Sistema, Replay e Copilot passaram a exibir provider, atualidade,
  atraso, fallback, avisos e campos ausentes;
- criado teste controlado `backend.scripts.test_market_provider`, separado do
  build e sem escrita de snapshots;
- documentados limites gratuitos/premium, importação autorizada, configuração
  Render/Vercel e decisão de não fazer scraping de Cboe Delayed Quotes;
- adicionados testes mockados de chave ausente, timeout, rate limit, payload
  incompleto, cache, fallback, CSV, metadata e snapshots;
- Gamma, Dealer, Snapshot e Open Interest Engines permaneceram inalterados.

### Institutional Copilot — Knowledge Engine

- criada a rota `/copilot` com mensagens, histórico local, perguntas rápidas,
  sugestões e drawer responsivo;
- criado Knowledge Engine determinístico para Dealer Report, Replay, Heatmap,
  Analytics, AI Summary, Open Interest, GEX, Gamma e Volatility;
- respostas passaram a listar explicitamente os indicadores internos usados;
- perguntas sem dados retornam `Não há dados suficientes.`;
- histórico do chat ganhou validação e limites seguros no LocalStorage;
- criada abstração `CopilotProvider` e factory para futura integração com GPT,
  Claude ou outro LLM sem alterar a interface;
- nenhuma API, engine ou fórmula quantitativa foi modificada.

### Sprint 10 — Quality Gate e Performance

- auditadas todas as rotas web, navegação direta, Sidebar e atualização de rota
  dinâmica;
- adicionados error boundary global e página amigável para rotas inexistentes;
- corrigidos foco, restauração de foco, ciclo por Tab e fechamento por ESC nos
  overlays da Academy;
- tooltips passaram a vincular gatilho e descrição com `aria-describedby`;
- padronizados estados ausentes como `Indisponível`, números e percentuais em
  pt-BR e proteção contra `NaN`, `Infinity` e timestamps inválidos;
- endurecida a leitura de preferências, favoritos e progresso da Academy no
  LocalStorage, com defaults seguros para dados corrompidos;
- mensagens de erro do frontend e do CSV demonstrativo deixaram de expor
  caminhos locais ou detalhes técnicos;
- corrigida a comparação cronológica de snapshots e a diferença de campos
  ausentes, sem tratá-los como zero;
- conteúdo e overlays da Academy passaram a ser carregados sob demanda;
- removidos aliases educacionais sem consumidores comprovados;
- adicionada suíte frontend para providers, fallback, Market Summary, Replay,
  comparação, formatação, persistência, erros e contratos responsivos;
- APIs, contratos e engines quantitativos foram preservados.

### Sprint 4 — Volatility Engine

- criado `VolatilityEngine` para IV disponível no CSV, sem spot ou histórico
  inventados;
- adicionada normalização por linha de IV decimal e percentual;
- calculadas IV ponderada por OI, médias Call/Put, skew, extremos e mudanças
  contra `previous_iv`;
- adicionadas curvas por strike e vencimento;
- Expected Move implementado somente com spot, IV e prazo válidos;
- adicionado `GET /api/volatility`, sem criação de snapshot;
- demo e upload passaram a retornar `volatility_analysis`;
- snapshots preservam o bloco completo em `analysis_json`, sem migração SQL;
- dashboard recebeu cinco cards, Volatility Smile e aviso sobre IV Rank e IV
  Percentile;
- comparação de snapshots ampliada com IV e Expected Move;
- adicionados 11 testes unitários do Volatility Engine;
- todos os engines protegidos permaneceram byte a byte inalterados.

### Sprint 3 — Gamma Exposure Engine

- criado `GammaExposureEngine` por composição do Gamma Engine protegido;
- calculados Call, Put, Net e GEX bruto, extremos, Dealer Pressure, Gamma Flip,
  Gamma Magnet e curva por strike;
- adicionado `GET /api/gex` para o CSV demonstrativo;
- incorporado contexto GEX ao Dealer Report sem alterar o Dealer Engine;
- adicionados cards GEX, mapa institucional e curva de Gamma ao dashboard;
- snapshots novos passaram a preservar a curva GEX completa dentro de
  `analysis_json`;
- comparação histórica ampliada com Call/Put/GEX bruto, Dealer Pressure e
  Gamma Magnet;
- adicionados testes unitários, HTTP e regressão SHA-256 dos quatro engines
  protegidos;
- Open Interest, Dealer, Snapshot e Gamma Engine permaneceram byte a byte
  inalterados.

### Sprint 2 — Open Interest Engine

- evoluído `OpenInterestEngine` com OI total, Top 10, strike dominante,
  percentuais e OI Concentration Score HHI;
- adicionado `GET /api/open-interest` para o CSV demonstrativo;
- incorporado contexto explícito de OI ao Dealer Report sem alterar o Dealer
  Engine;
- adicionados quatro cards e gráfico de distribuição Call/Put OI;
- snapshots passaram a preservar o contrato OI completo automaticamente;
- comparação de snapshots ampliada com Call OI, Put OI, score e concentração;
- adicionados testes unitários de ranking, HHI, percentuais, zero e validação;
- Gamma, Dealer e Snapshot Engine permaneceram inalterados.

### Sprint 1 — Snapshots institucionais

- criado `SnapshotEngine` puro para validação, serialização, reconstrução,
  metadados e comparação;
- criada a tabela SQLite `institutional_snapshots` e índice cronológico;
- análises demo/upload agora persistem automaticamente e retornam `snapshot_id`;
- adicionados endpoints de lista, detalhe, criação manual e exclusão;
- criada página Snapshots com ordenação, abertura, exclusão e comparação de dois
  registros;
- adicionado botão `Salvar Snapshot` ao header existente;
- reconstrução reutiliza o dashboard com os dados salvos, sem recalcular engines;
- adicionados testes unitários do Snapshot Engine e testes HTTP do ciclo completo;
- Gamma Engine e Dealer Engine permaneceram inalterados.

### Inteligência institucional V2

- criado `OpenInterestEngine` com totais, Net OI, mudanças, concentração e
  extremos por strike;
- adicionados `v2_summary()` e `v2_by_strike()` ao Gamma Engine sem alterar os
  métodos ou resultados V1;
- criado Dealer Engine V2 com score direcional, intensidade, hedge esperado,
  riscos, proximidade estrutural e `decision_factors`;
- criado Commentary Engine V2 com linguagem probabilística, limitações e ação
  exclusivamente educacional;
- expandidos os endpoints demo/upload com `open_interest_summary`,
  `gamma_summary`, `dealer_report` e `strike_table`;
- preservados todos os endpoints e campos V4;
- adicionada linha compacta V2 ao dashboard e ampliada a tabela por strike com
  OI e variações;
- criado `docs/API.md` e atualizados README, arquitetura, engines e fluxo;
- adicionados testes de CSV sem CALL/PUT, OI zero, gamma ausente, valores
  inválidos, regimes Long/Short, concentrações e guardrail textual.

### Compatibilidade V2

- resultado Gamma da amostra preservado em 484,4;
- Call/Put Walls, Gamma Flip estimado e Gamma Magnet preservados;
- projeto Streamlit, SQLite e CSV demonstrativo preservados;
- preço e tempo real continuam ausentes, sem valores inventados.

### Adicionado

- backend FastAPI em `backend/`;
- endpoints de saúde, análise demo, upload, histórico e settings;
- schemas Pydantic para contratos HTTP;
- CORS para o frontend local;
- frontend Next.js com TypeScript, Tailwind CSS, ESLint e App Router;
- dashboard institucional responsivo;
- componentes AppShell, Sidebar, Header, MetricCard, StatusBadge, ConfidenceBar,
  InstitutionalCommentary, GexProfile, GammaHeatmap, StrikeTable e AlertCard;
- páginas Institucional, Heatmap, Analytics, Histórico e Configurações;
- estados de loading, erro e vazio;
- documentação específica do frontend;
- testes de endpoints FastAPI.

### Alterado

- engines, services, models de domínio e database movidos para `backend/`;
- Streamlit passou a consumir o backend Python compartilhado;
- requirements separados entre backend, frontend e desenvolvimento;
- documentação de arquitetura e fluxo atualizada para duas interfaces.

### Preservado

- projeto Streamlit e suas seis páginas;
- banco SQLite e schema;
- CSV demonstrativo;
- testes existentes;
- Gamma Engine byte a byte, sem mudança de cálculo.

### Validação

- compilação sintática aprovada para os 61 módulos Python;
- Ruff aprovado para aplicação, backend, Streamlit e testes;
- 11 testes legados aprovados;
- imports locais do frontend e presença dos componentes obrigatórios auditados;
- testes FastAPI e comandos `npm run lint`, `npm run typecheck` e `npm run build`
  aguardam instalação das dependências externas no ambiente de execução.

### Planejado

- estado compartilhado entre páginas;
- validação quantitativa formal;
- implementação de Heatmap e Analytics.

## [4.0 Web] - 2026-07-23

### Interface

- criado header de mercado com ativo, preço, variação, status da API, horário,
  origem e atualização manual;
- reorganizados os cards em duas linhas compactas de cinco métricas;
- substituído `InstitutionalCommentary` por `InstitutionalReport`;
- redesenhado o perfil GEX com zero central, PUT à esquerda e CALL à direita;
- redesenhado o heatmap com intensidade neutra/positiva/negativa e destaque dos
  níveis institucionais;
- adicionada tabela ordenada, compacta, com cabeçalho fixo e scroll interno;
- criado painel lateral de alertas com severidade, horário e estado;
- adicionados tooltips, skeleton, erro com retry e aviso de dados demonstrativos;
- adicionado o painel secundário `#0e1d30` ao design system.

### API

- mantidos todos os endpoints e campos existentes;
- adicionados Dealer Report estruturado, origem, modo, horários e indicador de
  CSV desatualizado à resposta de análise;
- mantidos preço e variação como `null` até existir integração real.

### Corrigido

- removidas cinco violações `react-hooks/set-state-in-effect` por meio de um
  hook remoto compartilhado;
- removido lockfile vazio na raiz que fazia o Next.js inferir o workspace
  incorreto;
- removidos estados visuais que indicavam conexão sem consultar a API.

### Validação

- ESLint aprovado;
- TypeScript `--noEmit` aprovado;
- build de produção Next.js aprovado para todas as sete rotas;
- Ruff aprovado nos schemas e endpoints alterados;
- 11 testes legados/Streamlit aprovados;
- health, demo, upload, histórico e CORS validados contra a API em execução;
- comunicação e atualização manual confirmadas no navegador;
- QA aprovado em 1366×768 e 768×900, sem overflow ou erros no console;
- hash do Gamma Engine preservado.

## [3.0 Alpha] - 2026-07-23

### Arquitetura

- criado o pacote `xau_ai_terminal`;
- separadas as camadas `core`, `models`, `services`, `database`, `ui`, `utils` e
  `views`;
- removida a pasta reservada `pages/` e adotado registro central de rotas;
- movidas configurações de runtime para `config.py` do pacote;
- centralizados textos, cores, estilos e identidade da aplicação;
- criada a camada de components para cards, métricas, tabelas, gráficos e sidebar;
- criados models imutáveis de análise, navegação e UI;
- criada orquestração institucional em um único serviço;
- separadas conexão SQLite e consulta de histórico;
- padronizados nomes semânticos:
  - `pages` -> `views`;
  - `ai_engine.py` -> `commentary_engine.py`;
  - `export_tv.py` -> `tradingview_exporter.py`;
  - `scheduler.py` -> `scheduler_service.py`;
  - `database.py` -> `connection.py`.

### Corrigido

- upload do Streamlit agora é aceito como objeto file-like;
- removida a navegação multipágina duplicada;
- substituído `use_container_width` depreciado por `width="stretch"`;
- adicionada validação de valores não finitos, strikes, open interest e volume;
- falhas inesperadas agora são registradas sem expor stack trace na UI.

### Qualidade

- adicionados testes com `pytest`;
- adicionados testes de todas as páginas via `AppTest`;
- adicionado teste de upload compatível com Streamlit;
- adicionado teste de regressão dos resultados gamma;
- adicionado lint com Ruff;
- adicionados `pyproject.toml`, `requirements-dev.txt` e `.gitignore`;
- criado conjunto completo de documentação técnica.

### Preservado

- todas as seis páginas e seus comportamentos;
- CSV demonstrativo;
- schema e leitura do SQLite;
- serviços de exportação e scheduler;
- Alert e Market Engine;
- cálculos e conteúdo do Gamma Engine, sem nenhuma alteração.

### Base inicial da V3

A base 3.0 Alpha introduziu:

- aplicação Streamlit com seis páginas;
- leitura de CSV de opções;
- Gamma, Dealer, AI/Commentary, Decision, Alert e Market Engines;
- banco SQLite `institutional_levels`;
- exportador JSON e status de scheduler;
- CSV demonstrativo.

## [2.x] - Histórico externo

O README legado informa que a V2 existia como base separada e não foi alterada pela
V3. O código e o histórico detalhado da V2 não fazem parte deste diretório, portanto
mudanças adicionais não podem ser reconstruídas com segurança.
# Sprint 13 — Real CME Data Activation

- Adicionado estado institucional persistente e endpoints `/api/market/institutional/status`, `/latest`, `/mode` e `/activate`.
- Dashboard, Analytics, mapa e Copilot reconhecem CME EOD e bloqueiam fallback demo silencioso.
- Open Interest CME ganhou volume, ratios, distribuição por vencimento e variação de OI quando disponível.
- Snapshots CME usam armazenamento dedicado, sem alterar o Snapshot Engine legado.
- Spot Alpha Vantage permanece separado; Gamma/GEX/IV/Dealer ficam indisponíveis quando não existem no boletim.
