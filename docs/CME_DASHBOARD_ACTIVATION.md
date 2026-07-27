# Ativação do Dashboard CME

## Fluxo anterior

O PDF confirmado era persistido em `cme_bulletin_imports` e exposto apenas pelos endpoints do importador. O Dashboard consultava `sample_options.csv` pelo `OptionDataProvider`; por isso os indicadores de Gamma, GEX, walls e Dealer podiam aparecer ao lado do OI CME.

## Fluxo Sprint 13

1. O usuário envia o Daily Bulletin para preview e confirmação.
2. O serviço valida, persiste hash, contratos, metadados, elegibilidade e Open Interest.
3. `GET /api/market/institutional/status` resolve a fonte ativa. Com uma importação CME confirmada no modo automático, o modo efetivo é `real_eod`.
4. `GET /api/market/institutional/latest` fornece o último boletim e as métricas OI reais.
5. O Dashboard usa apenas os campos suportados pelo CME e exibe Gamma/GEX/IV/Dealer como indisponíveis quando ausentes.
6. Spot, quando configurado, continua sendo obtido separadamente pelo Alpha Vantage e nunca é usado para fabricar Gamma ou GEX.

O modo pode ser persistido explicitamente com `POST /api/market/institutional/mode` (`auto`, `real_eod`, `manual`, `csv` ou `demo`). O botão **Salvar Snapshot** cria um registro CME na tabela dedicada, preservando o schema legado de snapshots.

## Métricas CME

Disponíveis: contratos, Calls, Puts, OI total, Call/Put OI, Put/Call OI Ratio, volume total e por lado, concentração/distribuição por strike e vencimento, variação de OI quando o boletim informar e metadata de fechamento.

Indisponíveis no fixture CME: Gamma, GEX, Gamma Flip, Gamma Magnet, IV, Expected Move, Dealer Bias, Market Regime e Confidence baseados em Gamma. Nenhum desses campos recebe valor de `sample_options.csv`.
