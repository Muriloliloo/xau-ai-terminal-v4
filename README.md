# XAU AI TERMINAL — Web 4.0 + Institutional Intelligence V2

Plataforma institucional para análise demonstrativa de gamma, Open Interest e
volatilidade implícita em opções de XAU.

O repositório mantém duas interfaces sobre a mesma camada Python:

- `frontend/`: dashboard web 4.0 em Next.js, TypeScript e Tailwind CSS;
- `app.py` + `xau_ai_terminal/`: interface Streamlit preservada como referência funcional;
- `backend/`: API FastAPI e fonte única de engines, serviços, models e SQLite.

## Dashboard web 4.0

A tela principal oferece:

- header de mercado com saúde da API, origem e horário do snapshot;
- duas linhas de cards institucionais com tooltips;
- linha adicional de score, intensidade, riscos e Call/Put OI;
- `Dealer Report` estruturado pelo backend;
- comentário probabilístico, fatores explícitos e ação educacional;
- perfil bilateral, mapa GEX e curva de Gamma por strike;
- tabela de GEX/OI/variações por strike;
- alertas de gamma, concentração, regime, confiança, preço e atualidade da fonte;
- estados de loading, falha, vazio e dados demonstrativos.
- snapshots automáticos e manuais, reconstrução integral e comparação histórica.
- distribuição Top 10 de Open Interest e OI Concentration Score.
- cards de IV, Volatility Smile e Expected Move somente quando existe spot.
- Institutional Copilot local, com histórico e respostas citando os indicadores
  internos utilizados.

O preço e sua variação permanecem indisponíveis até existir uma fonte real. A
interface mostra esse estado explicitamente e não cria cotações fictícias.

O GEX usa gamma fornecido ou estimado, Open Interest e multiplicador contratual
100. Sem preço spot, o sistema não apresenta os valores como GEX monetário
ajustado ao preço; o Gamma Flip mantém a estimativa discreta compatível.

## Inteligência institucional V2

- Open Interest Engine com OI atual/anterior, mudanças e concentração;
- Gamma Engine com totais por lado, acumulado, regiões e intensidade;
- Dealer Engine com score direcional de 0 a 100, riscos e fatores de decisão;
- Commentary Engine dinâmico, probabilístico e sem ordem definitiva;
- contratos adicionais `open_interest_summary`, `gamma_summary`,
  `dealer_report` e `strike_table`;
- resultados e campos V4 preservados.

Regras detalhadas: `docs/ENGINES.md`. Contrato HTTP: `docs/API.md`.

## Open Interest Engine — Sprint 2

O engine calcula Call, Put, Total e Net OI, participação percentual por strike,
Top 10, strike dominante e um OI Concentration Score HHI de 0 a 100. O bloco é
consumido pelo Dealer Report, dashboard, gráfico e snapshots.

## Gamma Exposure Engine — Sprint 3

O novo engine compõe o Gamma Engine protegido e fornece Call, Put, Net e GEX
bruto, extremos positivos/negativos, Dealer Pressure, Gamma Flip, Gamma Magnet e
a curva completa por strike. O contrato alimenta `GET /api/gex`, Dealer Report,
dashboard, mapa GEX, curva de Gamma e snapshots.

## Volatility Engine — Sprint 4

O engine normaliza IV decimal ou percentual, calcula médias, skew, extremos,
variação contra `previous_iv` e curvas por strike/vencimento. IV Rank e IV
Percentile permanecem indisponíveis sem histórico suficiente. Expected Move só
é calculado quando spot, IV e prazo válidos existem no CSV.

## Snapshots — Sprint 1

As análises demo e upload são salvas automaticamente no SQLite. A página
`/snapshots` lista os registros mais recentes, abre o dashboard preservado,
compara dois momentos e permite exclusão individual. O botão **Salvar Snapshot**
cria um marco manual adicional.

Consulte `docs/SNAPSHOTS.md` para schema, fluxo e limitações.

## Institutional Copilot

A rota `/copilot` fornece uma interface conversacional baseada no Knowledge
Engine local. Não existe chamada para OpenAI ou outro LLM. As respostas usam
somente Dealer Report, Replay, Heatmap, Analytics, AI Summary, Open Interest,
GEX, Gamma e Volatility disponíveis no contexto carregado.

Perguntas sem dados suficientes retornam explicitamente
`Não há dados suficientes.`. A abstração `CopilotProvider` permite integrar um
LLM futuro sem mudar a interface ou o contrato das mensagens. Consulte
`docs/COPILOT.md`.

## Requisitos

- Python 3.12;
- Node.js 20.9 ou superior;
- npm 10+.

## Backend

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Documentação OpenAPI: `http://localhost:8000/api/docs`.

Endpoints:

- `GET /api/health`;
- `POST /api/analysis/demo`;
- `POST /api/analysis/upload`;
- `GET /api/history`;
- `GET /api/settings`.
- `GET /api/snapshots`;
- `GET /api/snapshots/{id}`;
- `POST /api/snapshots/create`;
- `DELETE /api/snapshots/{id}`.
- `GET /api/open-interest`.
- `GET /api/gex`.
- `GET /api/volatility`.

## Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Interface: `http://localhost:3000`.

Por padrão, o frontend usa `http://localhost:8000/api`. Altere
`NEXT_PUBLIC_API_URL` quando necessário.

## Streamlit de referência

```powershell
python -m streamlit run app.py
```

O Streamlit importa diretamente `backend/core`, `backend/services` e
`backend/database`; não existem cópias separadas dos engines.

## Testes e validação

```powershell
python -m pytest
python -m ruff check app.py backend xau_ai_terminal tests

cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

O build web e os testes HTTP exigem a instalação prévia de
`requirements-dev.txt` e `frontend/package.json`. A ausência dessas dependências
é uma falha de ambiente, não deve ser tratada como validação aprovada.

O dashboard é validado com testes de unidade/contrato, ESLint, TypeScript e
build de produção. Os testes incluem providers e fallback, Market Summary,
Replay, snapshots, formatação pt-BR, preferências, favoritos, LocalStorage
corrompido, estados indisponíveis, regressão Gamma, Gamma Exposure, hashes
protegidos, Open Interest, Volatility, extremos de entrada, comentário e
endpoints. A suíte HTTP requer FastAPI,
Pydantic e HTTPX instalados no mesmo
ambiente Python usado pelo comando `pytest`.

Também foram validados em execução real os endpoints de health, demo, upload e
histórico, o CORS local, o botão de atualização e os layouts em 1366×768 e
768×900, sem overflow horizontal ou mensagens no console.

## Estrutura

```text
backend/             FastAPI, domínio e SQLite
frontend/            Next.js App Router
xau_ai_terminal/     views e UI Streamlit preservadas
tests/               testes legados e Streamlit
docs/                documentação técnica
data/                CSV demonstrativo
database/            banco SQLite
```

Consulte `docs/ARCHITECTURE.md` e `docs/DATA_FLOW.md` antes de alterar contratos ou
cálculos.
