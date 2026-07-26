# Changelog

Todas as mudanças conhecidas do XAU AI TERMINAL são registradas neste arquivo.

O formato segue os princípios de Keep a Changelog. O projeto ainda está em fase
Alpha e não adota releases estáveis.

## [Unreleased]

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
