# Limitações dos dados CME

## Atualidade

O boletim é `end_of_day` e manual. A data do mercado é extraída do cabeçalho,
mas o PDF não informa um horário de fechamento utilizável; por isso
`market_timestamp` carrega a data à meia-noite UTC apenas como representação
de data, acompanhada de warning. `retrieved_at` é o instante da importação, não
o instante de mercado.

Nenhum texto da interface ou do Copilot deve dizer “agora”, “em tempo real”,
“ao vivo” ou “intradiário” para esta fonte.

## Campos ausentes

O arquivo auditado não fornece:

- Gamma;
- implied volatility;
- preço spot/underlying;
- bid/ask normalizados;
- hora do mercado;
- data completa de vencimento para todos os meses.

Ausência permanece `null`. Não é convertida em zero.

Delta existe em parte das linhas, mas Delta isolado não é suficiente para
derivar Gamma. Sem Gamma, o Gamma/GEX Engine não é executado. Sem IV, não há
Volatility Smile, IV Rank ou IV Percentile. Sem spot, não há Expected Move nem
GEX monetário.

## Open Interest e volume

Open Interest está disponível em 4.389 dos 4.397 contratos mínimos. Volume
existe em 923 linhas; a ausência nas demais linhas significa “não reportado no
campo extraído”, não zero. O Open Interest Engine recebe somente linhas com OI
explícito.

O volume agregado é a soma apenas dos campos explicitamente publicados:
Open Outcry + Globex + PNT. Se nenhum componente está presente, `volume=null`.

## Vencimentos

Datas exatas são derivadas exclusivamente da tabela **METAL FUTURES CONTRACTS
LAST TRADE DATES** da página 1, pelo alinhamento entre mês e coluna do próprio
PDF. Meses de contrato que cruzam o ano são ajustados de acordo com o mês
publicado, por exemplo JAN27 com última negociação em dezembro de 2026.

Foram normalizadas 15 datas exatas:

`2026-07-24`, `2026-07-28`, `2026-07-31`, `2026-08-07`,
`2026-08-14`, `2026-08-26`, `2026-09-24`, `2026-10-27`,
`2026-11-24`, `2026-12-28`, `2027-01-26`, `2027-02-23`,
`2027-03-24`, `2027-04-27`, `2027-05-25`.

DEC27, JAN28 e DEC28 não têm data exata na tabela de referência do PDF. Esses
contratos permanecem com `expiration=null` e warning. Nenhuma regra externa foi
inventada.

## Alinhamento com spot

O spot nunca é combinado automaticamente. Se um timestamp for informado
explicitamente na confirmação:

| Diferença de data | Status |
|---:|---|
| mesma data | `aligned` |
| 1 dia | `acceptable_with_warning` |
| 2–3 dias | `stale` |
| mais de 3 dias | `incompatible` |
| spot/data ausente | `unavailable` |

O arquivo real foi validado sem spot e recebeu `unavailable`.

## Escopo do parser

- captura apenas blocos com produto e CALL/PUT explícitos;
- não infere o lado de linhas semanais/micro ambíguas;
- ignora outros metais;
- ignora a seção EOO/Blocks para não duplicar volume;
- depende de PDF textual com coordenadas; PDF escaneado sem texto é rejeitado
  nesta versão;
- não usa OCR, rede ou serviços externos.

## Licenciamento

Este software não declara autorização da CME, não redistribui automaticamente
o PDF e não substitui um feed licenciado. O usuário é responsável por observar
os termos de uso, armazenamento, processamento e distribuição aplicáveis.

