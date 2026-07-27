# Data Providers

## Objetivo e limites

A camada `backend/providers/` separa aquisição, normalização, validação, cache e
fallback dos engines quantitativos. Nenhum componente do frontend chama uma API
externa e nenhuma chave privada atravessa o contrato HTTP.

```text
Fonte autorizada
 -> provider backend
 -> modelo normalizado + metadata
 -> validação
 -> cache TTL (quando externo)
 -> API interna
 -> análise institucional existente
 -> dashboard, snapshots, replay e Copilot
```

Os engines protegidos continuam recebendo o mesmo formato tabular. A nova camada
não muda suas fórmulas e não cria valores para campos ausentes.

## Providers

| Provider | Capacidades | Atualidade declarada | Requer chave |
|---|---|---|---|
| `alpha_vantage` | spot de ouro/XAU e histórico diário | `delayed` conservador para spot; `historical` para série diária | sim |
| `manual` | cadeia de opções e spot quando o arquivo o contém | `manual` | não |
| `csv` | arquivo local expressamente autorizado | `manual` | não |
| `demo` | `data/sample_options.csv` | `demo` | não |
| `cme_bulletin` | opções de ouro, OI, volume e settlement do Section 64 | `end_of_day` | não |

`cme_bulletin` só fica disponível após confirmação explícita de um PDF local
fornecido pelo usuário. É um provider manual de fechamento diário, sem download
automático, scraping ou atualização intradiária. Como o contrato CME pode ser
parcial, a metadata sempre expõe `is_partial`, `warnings` e `missing_fields`.
No arquivo de referência, Gamma, IV e spot são ausentes; apenas o Open Interest
Engine é elegível.

O Alpha Vantage documenta `GOLD_SILVER_SPOT` e `GOLD_SILVER_HISTORY`.
O provider não classifica o spot como tempo real porque o plano/entitlement
configurado não comprova latência em tempo real. Cadeias de opções em tempo real
do Alpha Vantage são premium e não são contornadas.

Referências oficiais:

- <https://www.alphavantage.co/documentation/>
- <https://www.alphavantage.co/premium/>

## Contrato comum

`MarketDataProvider` define:

- `get_metadata()`;
- `is_available()`;
- `get_spot()`;
- `get_market_snapshot()`;
- `get_option_chain()`;
- `get_health()`.

Os modelos centrais são `NormalizedMarketData`, `NormalizedSpot`,
`NormalizedOptionContract`, `NormalizedOptionChain`, `ProviderMetadata` e
`DataFreshness`.

Toda resposta normalizada identifica:

- provider e origem efetivos;
- símbolo;
- horário de coleta (`retrieved_at`);
- horário de mercado, se conhecido (`market_timestamp`);
- atraso calculável, se conhecido;
- classe de atualidade;
- estado demo/manual/parcial;
- avisos e campos ausentes;
- status e uso de fallback.

Tipos de atualidade: `realtime`, `delayed`, `end_of_day`, `historical`,
`manual`, `demo` e `unavailable`. `realtime` só pode ser emitido quando a fonte
e o plano realmente garantirem essa condição.

## Contrato de opções esperado pelos engines

Campos obrigatórios da cadeia:

| Campo | Formato e unidade |
|---|---|
| `strike` | número finito maior que zero, na unidade de preço do ativo |
| `option_type` | `CALL` ou `PUT`; aliases `C`, `P`, `CALLS`, `PUTS` são normalizados |
| `open_interest` | quantidade de contratos, finita e não negativa |
| `volume` | quantidade de contratos no período da fonte, finita e não negativa |

Campos opcionais:

| Campo | Formato |
|---|---|
| `symbol` | texto, normalizado para maiúsculas |
| `expiration` | data ISO `YYYY-MM-DD` |
| `bid`, `ask`, `last` | preço não negativo |
| `implied_volatility` | decimal (`0.25`) ou percentual (`25`), normalizado para `0.25` |
| `delta` | entre -1 e 1 |
| `gamma`, `vega` | não negativos |
| `theta` | número finito |
| `underlying_price` | preço spot maior que zero |
| `timestamp` | ISO 8601, normalizado para UTC |
| `source` | identificação textual da origem |

Os arquivos também podem trazer `previous_open_interest`, `previous_iv`,
`days_to_expiry` e `aggressor` para os engines que já os suportam. A ausência de
um campo opcional é registrada; não é convertida silenciosamente em zero.

## Factory e fallback

`MARKET_DATA_PROVIDER` aceita `auto`, `alpha_vantage`, `manual`, `csv`,
`cme_bulletin` e `demo`. O provider CME não é selecionado silenciosamente:
deve existir uma importação confirmada na execução.

Em `auto`, a factory procura:

1. provider externo configurado e capaz;
2. importação manual confirmada na execução;
3. arquivo local autorizado;
4. CSV demonstrativo, quando `ALLOW_DEMO_FALLBACK=true`.

Falhas controladas de provider podem avançar para a próxima fonte autorizada.
A resposta sempre informa o provider efetivo e `fallback_used`; a origem nunca
é mascarada.

## Cache e erros

O Alpha Vantage usa cache em memória, thread-safe, com TTL configurável. A chave
inclui provider, endpoint e parâmetros/símbolo. Erros não entram no cache e
entradas expiradas são removidas de forma oportunista.

Erros públicos são estáveis: chave ausente, timeout, rate limit, resposta
incompleta e recurso premium. Chaves, stack traces, parâmetros secretos e
caminhos locais não são retornados.

## Adicionar um provider

1. Implemente `MarketDataProvider`.
2. Normalize a saída para os models de `backend/providers/models.py`.
3. Declare capacidades e atualidade de forma conservadora.
4. Registre a implementação em `provider_factory.py`.
5. Adicione mocks para sucesso, erro, timeout, limite, cache e fallback.
6. Exponha somente pela API interna; nunca chame o fornecedor pelo navegador.
7. Documente licença, limites, unidades, entitlement e política de atualização.

Um provider novo não deve exigir alterações em Gamma, Dealer, Snapshot, Open
Interest ou nos componentes consumidores.
# Ativação institucional CME (Sprint 13)

O provider institucional ativo é resolvido separadamente do provider de spot. A ordem em modo automático é: última importação CME confirmada, manual/CSV autorizado e, apenas com `ALLOW_DEMO_FALLBACK=true`, demonstração explícita. O estado e a origem são visíveis em `/api/market/institutional/status`; não há combinação silenciosa entre Alpha Vantage, CME e `sample_options.csv`.
