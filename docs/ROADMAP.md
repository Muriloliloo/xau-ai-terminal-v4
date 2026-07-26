# Roadmap

> Versão atual: 3.0 Alpha  
> Atualizado em: 2026-07-26

## Princípios

1. correção e rastreabilidade antes de novas fontes;
2. engines independentes de interface e infraestrutura;
3. dados e fórmulas com contratos versionados;
4. alterações protegidas por testes;
5. IA somente sobre uma base quantitativa confiável.

## Concluído — Fundação profissional

- [x] pacote `xau_ai_terminal`;
- [x] separação entre core, models, services, database, ui, utils e views;
- [x] navegação única sem pasta reservada `pages/`;
- [x] constantes centrais para textos, cores e estilos;
- [x] componentes de cards, métricas, tabelas, gráficos e sidebar;
- [x] models imutáveis para resultados e UI;
- [x] caso de uso central de análise institucional;
- [x] loader compatível com caminhos e uploads file-like;
- [x] validação de domínio das colunas obrigatórias;
- [x] banco separado em conexão e repositório;
- [x] variáveis de ambiente para caminhos de runtime;
- [x] testes de páginas, upload e regressão do Gamma Engine;
- [x] lint e configuração de ferramentas;
- [x] documentação e changelog.

## Implementado — Fundação da migração web

- [x] backend FastAPI estruturado por routers, schemas, services e domínio;
- [x] endpoints de health, demo, upload, histórico e settings;
- [x] CORS para desenvolvimento local;
- [x] engines movidos para `backend/core` sem duplicação;
- [x] Streamlit adaptado para o backend compartilhado;
- [x] frontend Next.js com App Router, TypeScript, Tailwind e ESLint;
- [x] design system institucional;
- [x] dashboard integrado ao contrato HTTP;
- [x] upload e páginas auxiliares conectadas ao backend;
- [x] estados de loading, erro e vazio;
- [x] testes de endpoints definidos.

## Gate de validação da migração

- [x] sintaxe dos 61 módulos Python compilada;
- [x] Ruff aprovado em `app.py`, `backend/`, `xau_ai_terminal/` e `tests/`;
- [x] 11 testes legados aprovados;
- [x] imports locais do frontend auditados;
- [x] hash do Gamma Engine preservado;
- [x] instalar dependências FastAPI/Pydantic/HTTPX e executar toda a suíte;
- [x] instalar dependências Node e executar `npm run lint`;
- [x] executar `npm run typecheck`;
- [x] executar `npm run build`;
- [x] validar a comunicação pelos contratos HTTP e TestClient.

O ciclo só pode ser marcado como concluído quando todos os gates acima estiverem
verdes.

## Concluído — Sprint 1: Snapshots institucionais

- [x] Snapshot Engine independente de FastAPI e SQLite;
- [x] tabela `institutional_snapshots` com schema versionado;
- [x] persistência automática de demo e upload;
- [x] CRUD HTTP de snapshots;
- [x] página Snapshots integrada ao shell atual;
- [x] reconstrução do dashboard sem recálculo;
- [x] criação manual pelo botão `Salvar Snapshot`;
- [x] ordenação cronológica e comparação de dois registros;
- [x] testes unitários e de ciclo HTTP;
- [x] Gamma e Dealer preservados.

## Concluído — Sprint 2: Open Interest Engine

- [x] Call, Put, Total e Net OI;
- [x] percentual e maior concentração por strike;
- [x] Top 10 strikes;
- [x] OI Concentration Score HHI;
- [x] endpoint dedicado;
- [x] contexto OI no Dealer Report;
- [x] cards e gráfico no dashboard;
- [x] persistência e comparação em snapshots;
- [x] testes unitários e validação integrada;
- [x] Gamma, Dealer e Snapshot Engine preservados.

## Concluído — Sprint 3: Gamma Exposure Engine

- [x] Call, Put, Net e Total GEX bruto;
- [x] maiores exposições positiva e negativa;
- [x] Dealer Pressure e score normalizado;
- [x] Gamma Flip e Gamma Magnet compatíveis;
- [x] endpoint `GET /api/gex`;
- [x] contexto GEX no Dealer Report;
- [x] cards, mapa GEX e curva de Gamma;
- [x] persistência e comparação em snapshots;
- [x] testes unitários, HTTP e hashes protegidos;
- [x] Open Interest, Dealer, Snapshot e Gamma Engine preservados.

## Concluído — Sprint 4: Volatility Engine

- [x] normalização de IV decimal e percentual;
- [x] IV ponderada, Call/Put IV, skew, mínimos e máximos;
- [x] variação contra `previous_iv` e extremos;
- [x] curvas por strike e vencimento;
- [x] Expected Move condicionado a spot, IV e prazo;
- [x] endpoint `GET /api/volatility` sem snapshot;
- [x] integração demo/upload e persistência em `analysis_json`;
- [x] cinco cards e Volatility Smile;
- [x] comparação histórica e compatibilidade com snapshots antigos;
- [x] testes unitários e contratos HTTP;
- [x] engines protegidos preservados.

## Concluído — Sprint 11: Real Data Foundation

- [x] contrato normalizado de spot, cadeia e metadata;
- [x] factory/registry com Alpha Vantage, manual, CSV e demo;
- [x] Alpha Vantage opcional para spot e histórico oficial;
- [x] cache TTL, retry limitado e erros sanitizados;
- [x] importação manual com prévia e confirmação;
- [x] endpoints internos de provider/market data;
- [x] badges e painel Fontes de Dados;
- [x] provenance em snapshots, Replay e Copilot;
- [x] compatibilidade de snapshots antigos;
- [x] testes externos mockados e script controlado separado;
- [x] decisão documentada de não fazer scraping Cboe;
- [x] engines protegidos preservados.

Próximos passos de dados: validar uma chave real em ambiente autorizado,
monitorar consumo de cota gratuita, avaliar uma API oficial/licenciada de option
chain e adicionar circuit breaker apenas quando houver operação externa
recorrente.

## Próximo ciclo — Governança de persistência e estado

Prioridade P1:

- adicionar ferramenta formal de migrações;
- registrar versão individual dos engines;
- compartilhar último resultado via `st.session_state`;
- alimentar Dashboard com estado real;
- tornar Configurações funcionais;
- criar política de retenção e backup.

Critério de conclusão: retenção, backup e evolução de schema são operáveis sem
perda de snapshots.

## Validação quantitativa

Prioridade P1:

- especificar formalmente gamma e GEX;
- declarar unidades e multiplicadores;
- incorporar spot e parâmetros de mercado quando aprovados;
- revisar Gamma Flip, Gamma Magnet e walls;
- revisar hipótese de posição dealer;
- calibrar ou remover confiança percentual;
- criar dataset independente de referência;
- versionar fórmulas e parâmetros;
- obter revisão quantitativa.

Critério de conclusão: resultados são comparáveis a referências externas e carregam
versão da metodologia.

## Produto analítico

Prioridade P2:

- evoluir o Heatmap web compacto para uma matriz por vencimento;
- implementar Analytics histórico persistido;
- ampliar regras e categorização do Alert Engine;
- definir contrato do Market Engine;
- conectar exportação TradingView;
- ativar scheduler idempotente;
- adicionar filtros de vencimento;
- comparar estrutura temporal;
- mostrar atualidade e qualidade da fonte.

Critério de conclusão: nenhuma página é placeholder e todas exibem fonte, timestamp e
estado vazio/erro.

## Fontes e operação

Prioridade P2/P3:

- adaptador para preço spot;
- adaptador para cadeia de opções;
- persistência de entrada bruta;
- timeout, retry, rate limit e circuit breaker;
- configuração de secrets;
- health checks;
- logs estruturados, métricas e tracing;
- backup/restauração;
- container e pipeline de deploy;
- autenticação e auditoria quando necessárias.

Critério de conclusão: falhas externas não corrompem snapshots e a origem é
auditável.

## IA avançada

Prioridade P3, somente após dados e avaliação:

- definir caso de uso mensurável;
- manter fatos estruturados fora do texto gerado;
- avaliar saídas offline;
- registrar modelo, prompt, custo e latência;
- aplicar guardrails financeiros;
- avaliar detecção de anomalias apenas com histórico confiável.

## Dívida conhecida

- Histórico legado permanece somente leitura; snapshots usam tabela própria;
- Dashboard Streamlit ainda não compartilha o último resultado institucional;
- Settings não controla scheduler;
- Market Engine não está conectado;
- Alert Engine está exposto na análise HTTP, mas mantém o conjunto de regras atual;
- fórmulas quantitativas são as originais;
- schema é idempotente, mas ainda não há ferramenta formal de migrações;
- não há CI configurado no repositório;
- dependências ainda usam faixas, sem lockfile completo.

## Definição de pronto

Uma entrega futura deve:

- preservar ou atualizar contratos explicitamente;
- incluir testes de caminho feliz e falha;
- passar `pytest`, `ruff` e smoke test Streamlit;
- atualizar docs e changelog;
- registrar implicações quantitativas;
- não introduzir controles de UI sem efeito;
- não expor detalhes internos em mensagens de erro.
