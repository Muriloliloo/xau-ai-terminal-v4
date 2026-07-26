# API

Base local: `http://localhost:8000/api`

OpenAPI: `http://localhost:8000/api/docs`

## Endpoints preservados

| Método | Rota | Resposta |
|---|---|---|
| GET | `/health` | status, nome e versão |
| POST | `/analysis/demo` | análise do `sample_options.csv` |
| POST | `/analysis/upload` | análise do CSV multipart |
| GET | `/history` | histórico SQLite |
| GET | `/settings` | capacidades e flags do runtime |
| GET | `/snapshots` | lista snapshots por data descendente |
| GET | `/snapshots/{id}` | retorna metadados e análise integral |
| POST | `/snapshots/create` | cria snapshot manual |
| DELETE | `/snapshots/{id}` | exclui snapshot |
| GET | `/open-interest` | análise OI do CSV demonstrativo |
| GET | `/gex` | Gamma Exposure completo do CSV demonstrativo |
| GET | `/volatility` | IV, skew, curvas e Expected Move da amostra |

## Análise V2

`POST /analysis/demo` e `POST /analysis/upload` preservam todos os campos V4 e
adicionam blocos institucionais compatíveis.

As respostas também retornam `snapshot_id` e
`snapshot_saved_automatically=true`. A persistência acontece antes da resposta
HTTP ser concluída.

### `open_interest_analysis`

O bloco contém Call, Put, Total e Net OI, strike e percentual de maior
concentração, `oi_concentration_score`, `top_10_strikes` e
`distribution_by_strike`.

Cada strike fornece rank, Call/Put/Total/Net OI e participação percentual. O
mesmo bloco é persistido dentro de snapshots novos.

### `open_interest_summary`

```json
{
  "call_oi_total": 35585.0,
  "put_oi_total": 32698.0,
  "net_oi": 2887.0,
  "largest_call_oi_strike": 4100.0,
  "largest_put_oi_strike": 4000.0,
  "new_oi_total": 4292.0,
  "reduced_oi_total": 0.0,
  "largest_oi_increase_strike": 4100.0,
  "largest_oi_decrease_strike": null,
  "max_concentration_pct": 19.0384,
  "has_previous_open_interest": true
}
```

### `gamma_summary`

Inclui Call/Put/Net/Gross GEX, strikes positivos/negativos dominantes, níveis
legados, distâncias, concentração por região e `regime_strength`.

`gamma_flip` é um nível estimado pelo algoritmo legado. A API não o apresenta
como curva real.

### `gamma_exposure_analysis`

Contém `call_gex`, `put_gex`, `net_gex`, `total_gex` bruto, maiores exposições
positiva e negativa, `dealer_pressure`, score normalizado, Gamma Flip, Gamma
Magnet, origem do gamma e `curve_by_strike`.

Cada linha da curva inclui:

```text
strike
call_gex, put_gex, net_gex, total_gex
cumulative_net_gex
call_oi, put_oi
contribution_pct
dealer_pressure
```

`contract_multiplier=100` e `spot_adjusted=false` tornam a unidade explícita.
Uploads recebem o mesmo bloco dentro da resposta de análise.

### `volatility_analysis`

Presente nas respostas demo/upload e opcional para compatibilidade histórica:

```text
volatility_summary
├── weighted_iv, call_iv, put_iv e iv_skew
├── call_skew, put_skew e classificação
├── minimum_iv, maximum_iv e respectivos strikes
└── variação ponderada e maiores aumento/redução
expected_move
volatility_curve
expiry_curve
iv_rank: null
iv_percentile: null
```

Todos os campos IV da API são números percentuais formatáveis. Por exemplo,
`0.25` internamente retorna `25.0`. Diferenças de IV representam pontos
percentuais.

### `dealer_report`

Inclui:

- regime e intensidade;
- bias e hedge provável;
- volatilidade, riscos de rompimento/reversão;
- proximidade estrutural;
- score direcional e confiança;
- nível crítico;
- `decision_factors`;
- comentário e ação educacional.

### `strike_table`

Cada linha preserva os campos GEX e acrescenta:

```text
cumulative_gex
call_oi, put_oi, net_oi
previous_call_oi, previous_put_oi
call_oi_change, put_oi_change
concentration_pct
```

## Open Interest

```http
GET /api/open-interest
```

Executa somente a análise de Open Interest sobre `sample_options.csv`. Não cria
snapshot. Uploads recebem as mesmas métricas dentro de
`POST /api/analysis/upload`.

## Gamma Exposure

```http
GET /api/gex
```

Executa o Gamma Exposure Engine sobre `sample_options.csv` e não cria snapshot.
O contexto também é retornado em `dealer_report.gamma_exposure_context`.

## Volatilidade

```http
GET /api/volatility
```

Analisa `sample_options.csv` e não cria snapshot. O retorno contém
`volatility_summary`, `expected_move`, `volatility_curve` por
vencimento/strike e `expiry_curve`.

Na amostra, Expected Move retorna:

```json
{
  "available": false,
  "reason": "Indisponível sem preço spot",
  "expected_move_points": null,
  "expected_move_pct": null,
  "upper_level": null,
  "lower_level": null,
  "expiry": null
}
```

IV Rank e IV Percentile permanecem `null` porque não existe série histórica
suficiente.

## Upload

```powershell
curl.exe -X POST http://localhost:8000/api/analysis/upload `
  -F "file=@data/sample_options.csv;type=text/csv"
```

Somente nomes terminados em `.csv` são aceitos. O conteúdo passa pelas mesmas
regras da amostra e não é salvo no servidor.

O arquivo bruto não é salvo. O resultado institucional calculado é persistido
como snapshot.

## Snapshots

### Lista

```http
GET /api/snapshots?limit=100
```

Retorna metadados sem o JSON pesado, ordenados por `created_at DESC, id DESC`.
`limit` aceita valores de 1 a 500.

### Detalhe

```http
GET /api/snapshots/42
```

Retorna os metadados e `analysis`, um `AnalysisResponse` completo que reconstrói
o dashboard.

### Criação manual

```json
{
  "analysis": { "...": "AnalysisResponse atual" },
  "label": "Fechamento"
}
```

`POST /api/snapshots/create` retorna 201.

### Exclusão

`DELETE /api/snapshots/{id}` retorna 204. Id inexistente retorna 404.

## Erros

| Status | Situação |
|---:|---|
| 404 | amostra configurada não encontrada |
| 415 | upload sem extensão `.csv` |
| 422 | colunas ausentes, tipos ou domínios inválidos |

## CORS e tempo real

Origins locais `localhost:3000` e `127.0.0.1:3000` são permitidas. Não existe
integração de preço ou fluxo ao vivo; `price` e `price_change_percent` permanecem
`null`.
