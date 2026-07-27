# Mapeamento de campos do CME Bulletin

## Origem e identificação

| Campo normalizado | Origem no PDF | Regra |
|---|---|---|
| `symbol` | produto Ouro | `GC`, identificador canônico interno |
| `exchange` | cabeçalho COMEX | `COMEX` |
| `product_code` | início do bloco | OG, OG1, OG2, OG4 ou OG5 |
| `product_name` | cabeçalho do bloco | texto `GOLD OPTIONS` validado |
| `option_type` | cabeçalho do bloco | CALL ou PUT explícito |
| `contract_month` | linha de mês | rótulo como AUG26 |
| `market_date` | cabeçalho do boletim | `2026-07-24` |
| `source` | documento | nome estável da Section 64 |
| `source_page` | página PDF | 1-based |
| `source_line` | baseline textual agrupada | 1-based na página |
| `raw_text` | linha reconstruída | trecho de auditoria, não o PDF integral |

## Dados quantitativos

| Campo normalizado | Coluna publicada | Ausência |
|---|---|---|
| `strike` | primeiro número da linha | contrato ignorado/inválido |
| `settlement` | `SETT.PRICE` | `null` |
| `delta` | `DELTA` | `null` |
| `open_outcry_volume` | `OPEN OUTCRY VOLUME` | `null` |
| `globex_volume` | `GLOBEX VOLUME` | `null` |
| `pnt_volume` | `PNT VOLUME` | `null` |
| `volume` | soma somente de componentes presentes | `null` se todos ausentes |
| `open_interest` | `OPEN INTEREST` | `null` |
| `open_interest_change` | mudança após OI (`+`, `-`, `UNCH`) | `null`; `UNCH` é 0 publicado |
| `expiration` | Last Trade Dates da página 1 | `null` + warning |
| `implied_volatility` | não existe no arquivo auditado | `null` |
| `gamma` | não existe no arquivo auditado | `null` |
| `underlying_price` | não existe no arquivo auditado | `null` |

O parser usa coordenadas horizontais e tolerância de baseline, não `split()` por
quantidade fixa de espaços. Isso mantém campos em branco e diferencia as três
colunas de volume.

## Indicadores de preço

A legenda do boletim define:

- `R`: record volume ou Open Interest;
- `B`: bid;
- `A`: ask;
- `P`: post-settlement session;
- `N`: nominal close.

Indicadores incorporados a faixas bid/ask não são convertidos em settlement.
`UNCH` em mudança de OI representa zero reportado. A unidade monetária do
settlement não é inferida pelo parser, pois o trecho auditado não a declara de
forma suficiente para normalização segura.

## Validação

Contrato mínimo utilizável:

- produto de ouro identificável;
- CALL/PUT explícito;
- strike finito e maior que zero;
- OI não negativo, quando presente;
- volume não negativo, quando presente;
- página e linha de origem.

O relatório separa contratos mínimos válidos de contratos completos. Um
contrato pode ser válido para auditoria/OI e ainda ser parcial por não ter
volume, vencimento ou OI.

## Contrato comum de providers

O provider CME implementa `MarketDataProvider`. O modelo canônico legado exige
`volume` e `open_interest` não nulos; portanto, `get_option_chain()` expõe
somente as 915 linhas que têm ambos explícitos. O endpoint CME mantém os 4.397
contratos no schema específico, preservando todos os `null` e a rastreabilidade.

Essa adaptação não altera o contrato comum nem a Provider Factory protegida.

