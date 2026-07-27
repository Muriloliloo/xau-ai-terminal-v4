# Modos de dados institucionais

O estado ativo é persistido no SQLite em `institutional_data_state` e retornado por `/api/market/institutional/status`.

| Modo | Fonte | Fallback | Uso |
| --- | --- | --- | --- |
| `auto` | CME confirmado; depois demo somente se permitido | explícito | Operação padrão transparente |
| `real_eod` | Último CME confirmado | bloqueado | Exige importação CME |
| `manual` | Manual Options Provider | bloqueado | Arquivo CSV autorizado |
| `csv` | CSV local configurado | bloqueado | Fonte local autorizada |
| `demo` | `sample_options.csv` | não aplicável | Demonstração explícita |

Spot e histórico continuam sob responsabilidade do Alpha Vantage (quando configurado) e não fazem parte da Option Chain institucional. `data_mode=real_eod` sempre informa `provider=cme_bulletin`, `freshness=end_of_day` e a elegibilidade do boletim.

Quando Gamma ou IV não existem na fonte, os indicadores dependentes permanecem `null`/indisponíveis. Open Interest não é convertido em Gamma. O Copilot usa a mesma proveniência e responde “Não há dados suficientes.” para perguntas de Gamma sem dados.
