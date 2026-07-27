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
| GET | `/providers` | catálogo e configuração sanitizada dos providers |
| GET | `/providers/status` | status sem executar consulta externa |
| GET | `/market/spot` | spot normalizado ou estado indisponível |
| GET | `/market/history` | histórico diário normalizado |
| GET | `/market/options` | cadeia efetiva e metadata |
| GET | `/market/metadata` | metadata por capacidade |
| POST | `/market/options/import` | prévia/confirmacão de CSV manual |
| POST | `/market/cme-bulletin/preview` | prévia de PDF CME Section 64 (multipart, sem persistir) |
| POST | `/market/cme-bulletin/confirm` | confirma preview CME elegível e registra importação |
| GET | `/market/cme-bulletin/status` | limites, cache e última importação CME |
| GET | `/market/cme-bulletin/latest` | última importação CME confirmada |

## Análise V2

`POST /analysis/demo` e `POST /analysis/upload` preservam todos os campos V4 e
adicionam blocos institucionais compatíveis.

As respostas também retornam `snapshot_id` e
`snapshot_saved_automatically=true`. A persistência acontece antes da resposta
HTTP ser concluída.

`data_metadata` é aditivo e opcional. Ele informa provider, source, símbolo,
horários, atraso, classe de atualidade, estados demo/manual/parcial, warnings,
campos ausentes e fallback. Snapshots antigos sem o bloco continuam válidos.

## Market data

Todos os endpoints `GET /market/*` são somente leitura e não criam snapshots.
Quando o provider não está configurado ou o recurso é premium, retornam estado
`unavailable` com dados nulos/vazios e mensagem sanitizada.

### CME Daily Bulletin (Section 64)

Os quatro endpoints `/market/cme-bulletin/*` formam um fluxo de duas etapas para
PDFs fornecidos manualmente. O preview calcula SHA-256, extrai e valida os
blocos de ouro e mantém o resultado somente em cache com TTL; ele não altera
provider, engines ou snapshots. A confirmação exige um `preview_id` ainda
válido, rejeita estados `rejected`/`incompatible`, invalida o preview após uso e
persiste apenas metadata, relatório, contratos normalizados e hash (nunca o PDF
integral). Repetição do mesmo hash exige `allow_reprocess=true` explicitamente.

Todas as respostas CME identificam `freshness_type=end_of_day`,
`is_manual=true` e os avisos/campos ausentes. O boletim de referência não
contém Gamma, IV ou spot; portanto, a elegibilidade resultante é
`open_interest_only` e o Gamma/GEX Engine não é executado.

`POST /market/options/import` usa `confirm=false` por padrão. Nesse modo apenas
valida e devolve prévia. `confirm=true` executa os mesmos engines dos endpoints
de análise, atualiza o Manual Options Provider e cria o snapshot automático.
Arquivo inválido não altera estado.

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

## CORS e atualidade

Origins locais `localhost:3000` e `127.0.0.1:3000` são permitidas. Não existe
fluxo de opções ao vivo nesta Sprint. O spot opcional do Alpha Vantage é
classificado como atrasado enquanto o plano não comprovar tempo real. Na análise,
`price` só é preenchido quando o arquivo manual contém um
`underlying_price` único e válido; `price_change_percent` permanece `null`. O
spot externo não é injetado automaticamente nos engines nem em snapshots.
# Endpoints Sprint 13

- `GET /api/market/institutional/status` — fonte ativa, freshness, elegibilidade, spot separado e métricas disponíveis/indisponíveis.
- `GET /api/market/institutional/latest` — último CME confirmado e Open Interest real.
- `POST /api/market/institutional/mode` ou `/activate` — seleção persistida (`auto`, `real_eod`, `manual`, `csv`, `demo`).
- `POST/GET /api/market/institutional/snapshots` e `GET .../{id}` — snapshots CME parciais, armazenados fora do contrato legado.
