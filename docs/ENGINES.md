# Engines

## Fonte única

Todos os engines ficam em `backend/core/`. Next.js consome seus resultados pelo
FastAPI e o Streamlit importa a mesma camada Python.

| Engine | Arquivo | Responsabilidade |
|---|---|---|
| Open Interest V2 | `open_interest_engine.py` | OI atual, anterior, mudança e concentração |
| Gamma Exposure | `gamma_exposure_engine.py` | Perfil GEX completo e pressão dealer |
| Volatility | `volatility_engine.py` | IV, skew, curvas e Expected Move condicional |
| Gamma V1 + V2 | `gamma_engine.py` | Cálculo legado e diagnósticos GEX adicionais |
| Dealer V1 + V2 | `dealer_engine.py` | Compatibilidade V4 e score institucional explícito |
| Commentary V1 + V2 | `commentary_engine.py` | Comentário determinístico e probabilístico |
| Decision | `decision_engine.py` | Ação textual educacional |
| Alert | `alert_engine.py` | Alertas derivados do snapshot |
| Market | `market_engine.py` | Preservado; sem feed em tempo real |

## Open Interest Engine — Sprint 2

Entrada: DataFrame já validado pelo `Options Loader`.

`previous_open_interest` é opcional. Quando ausente, o engine usa o OI atual como
baseline e retorna variação zero; isso evita classificar todo o snapshot como OI
novo. Quando presente, valores vazios isolados também usam o OI atual daquela
linha.

Por strike:

```text
net_oi             = call_oi - put_oi
call_oi_change     = call_oi - previous_call_oi
put_oi_change      = put_oi - previous_put_oi
concentration_pct  = (call_oi + put_oi) / OI total × 100
```

No resumo:

- Call/Put OI total e Net OI;
- maior strike de Call/Put OI;
- OI novo: soma de todas as mudanças positivas por lado;
- OI reduzido: módulo da soma de todas as mudanças negativas por lado;
- maior aumento/redução: maior mudança líquida agregada por strike;
- concentração máxima e disponibilidade de histórico.
- Top 10 strikes ordenados por OI total;
- OI Concentration Score.

O score usa o índice Herfindahl-Hirschman sobre as participações por strike:

```text
share_i = OI do strike i / OI total
OI Concentration Score = Σ(share_i²) × 100
```

O resultado varia de 0 a 100. Um único strike com todo o OI produz 100; valores
menores indicam distribuição mais dispersa. O score é descritivo e não mede
direção, qualidade ou probabilidade de mercado.

`top_strikes(10)` retorna rank, strike, Call OI, Put OI, Total OI, Net OI e
percentual. Empates são ordenados pelo menor strike.

Se não houver OI positivo de um lado, o strike correspondente é `null`. Se não
houver aumento ou redução, o respectivo strike também é `null`.

## Volatility Engine — Sprint 4

O engine consome somente campos presentes no DataFrame validado. IV é
normalizada internamente para decimal, linha a linha:

```text
0 < IV <= 1  -> permanece decimal
IV > 1       -> IV / 100
IV <= 0, não finita ou normalizada > 10 -> inválida
```

Fórmulas principais:

```text
weighted_iv = Σ(IV × Open Interest) / Σ(Open Interest)
call_iv     = média aritmética das IV válidas de Calls
put_iv      = média aritmética das IV válidas de Puts
iv_skew     = put_iv - call_iv
iv_change   = normalized_iv - normalized_previous_iv
```

Classificação:

| IV Skew | Resultado |
|---:|---|
| `> 0,005` | Puts mais caras |
| `< -0,005` | Calls mais caras |
| demais valores válidos | Equilibrado |

Call skew é a IV do maior strike menos a IV do menor strike de Calls. Put skew
é a IV do menor strike menos a IV do maior strike de Puts. São retornados apenas
quando existem ao menos dois strikes válidos do lado correspondente.

As curvas são agregadas por strike e por vencimento. Quando `expiry` não existe,
o prazo válido é identificado como `D+n`.

Expected Move educacional:

```text
expected_move_points = spot × IV × sqrt(days_to_expiry / 365)
expected_move_pct    = IV × sqrt(days_to_expiry / 365) × 100
upper_level          = spot + expected_move_points
lower_level          = spot - expected_move_points
```

O vencimento válido mais próximo é utilizado. Sem spot, IV ou prazo, todos os
níveis retornam `null` e a razão é explícita. O engine não calcula IV Rank, IV
Percentile ou volatilidade histórica.

## Gamma Exposure Engine — Sprint 3

Entrada: o mesmo DataFrame validado usado pelo caso de uso institucional.

O engine chama `GammaEngine.calculate()` e agrega sua saída; o cálculo protegido
não é copiado nem alterado:

```text
Call GEX = gamma × Call OI × 100
Put GEX  = gamma × Put OI × 100 × -1
Net GEX  = Call GEX + Put GEX
Total GEX (bruto) = |Call GEX| + |Put GEX|
Dealer Pressure Score = Net GEX / Total GEX × 100
```

O score fica entre -100 e 100:

| Score | Dealer Pressure |
|---:|---|
| `> 10` | `SUPPRESSIVE` |
| `< -10` | `AMPLIFYING` |
| `-10 … 10` | `BALANCED` |

Por strike são retornados Call, Put, Net, GEX bruto, Net acumulado, Call/Put OI,
participação no GEX bruto e pressão local. O resumo também informa os maiores
Net GEX positivo e negativo, Gamma Flip e Gamma Magnet compatíveis.

`gamma_source` declara `provided`, `estimated` ou `mixed`. `spot_adjusted=false`
é explícito: o CSV atual não contém spot, portanto os valores representam
unidades de gamma contratual e não GEX monetário ajustado ao preço.

### Hashes protegidos da Sprint 3

O teste `test_protected_engine_hashes.py` valida:

| Arquivo | SHA-256 |
|---|---|
| `gamma_engine.py` | `2EEC0F4826A1A22C0D71CDEB1E909E679971AD95F3509FC217518F91A9BBF7DC` |
| `dealer_engine.py` | `CB69BC769646DBE58F215F74A955D4ECEC45E9C88A80BC33485D8A853C37F3CD` |
| `snapshot_engine.py` | `77FB604035E426483093DB3B2E73B79E0CC3DF0720DEAE32067343045A279B18` |
| `open_interest_engine.py` | `75BAC774897FC1AB2CEB5BC65DE31B763EB88E9F21ED8FBF43D4E8F1C4E37690` |

## Gamma Engine

### Compatibilidade V1

Os métodos existentes continuam com a mesma fórmula e semântica:

- `calculate()`;
- `by_strike()`;
- `call_wall()` e `put_wall()`;
- `gamma_flip()` e `gamma_magnet()`;
- `total_gex()` e `summary()`.

Baseline anterior à extensão:

```text
SHA-256 original  9705F8DFDE908E58831D026A5EC3FA86F4784E29D0B3491EC493AF0E0C237E37
Call Wall         4100.0
Put Wall          4000.0
Gamma Flip        4050.0
Gamma Magnet      4100.0
GEX Total         484.4
```

O arquivo recebeu somente métodos aditivos V2, portanto o hash físico mudou. O
teste `test_gamma_engine_regression.py` compara continuamente os cinco resultados
legados acima.

### Extensão V2

`v2_by_strike()` adiciona `cumulative_gex`, calculado pela soma acumulada do Net
GEX em strikes crescentes.

`v2_summary()` retorna:

- Call, Put, Net e Gross GEX total;
- strikes de maior Net GEX positivo e negativo;
- walls, magnet e Gamma Flip estimado;
- distâncias absolutas do flip para cada wall;
- concentração do módulo do Net GEX abaixo, no e acima do flip;
- intensidade pelo Net/Gross GEX.

Classificação:

| Net GEX / Gross GEX | Regime |
|---:|---|
| `>= 0,25` | FORTE LONG GAMMA |
| `> 0,02` | LONG GAMMA |
| `-0,02 … 0,02` | NEUTRO |
| `< -0,02` | SHORT GAMMA |
| `<= -0,25` | FORTE SHORT GAMMA |

O nível chamado `gamma_flip` mantém o nome do contrato legado, mas é explicitamente
descrito como **estimado**. Sem spot e modelo de curva completo ele não é chamado
de Gamma Flip real.

## Dealer Engine V2

O score é direcional:

- `0`: estrutura Short Gamma mais forte;
- `50`: neutra;
- `100`: estrutura Long Gamma mais forte.

Fórmula:

```text
score = clamp(
  50
  + 26 × balanço GEX
  +  8 × balanço OI
  +  6 × balanço da mudança de OI
  +  6 × balanço de volume
  +  4 × balanço agressor
)
```

Cada balanço é normalizado por magnitude. O agressor só participa quando a coluna
existe e possui peso diferente de zero.

Regras de saída:

- regime vem da classificação Gamma V2;
- intensidade é FORTE, MODERADA ou BAIXA;
- Long Gamma favorece hedge contrário à extensão, volatilidade controlada e maior
  risco relativo de reversão;
- Short Gamma favorece hedge a favor da extensão, volatilidade expansiva e maior
  risco relativo de rompimento;
- neutralidade retorna ambos os riscos como moderados;
- proximidade crítica é estrutural entre flip e walls; sem spot ela nunca simula
  distância do preço ao nível;
- confiança combina distância do score a 50 e concentrações máximas de OI/GEX,
  limitada a 95%;
- `decision_factors` registra evidências concretas do snapshot.

## Commentary Engine V2

O texto é montado condicionalmente a partir dos três resumos. Ele contém regime,
intensidade, níveis, OI, GEX, riscos, ação educacional, nível crítico, fatores e
limitações.

Guardrails:

- linguagem probabilística;
- nenhuma ordem definitiva;
- GEX e flip identificados como estimados;
- ausência de spot, curva completa e fluxo em tempo real declarada;
- CSV demonstrativo identificado como não representativo do mercado ao vivo.

Não há LLM, chamada externa ou dado inventado.

## Orquestração

```text
Options Loader
├── Gamma Engine V1/V2
├── Open Interest Engine V2
└── merge por strike
     └── Dealer Engine V2
          └── Commentary Engine V2
               └── InstitutionalAnalysis
                    └── schemas Pydantic
```

O Alert Engine é aplicado pelo router e não recalcula GEX ou OI.
