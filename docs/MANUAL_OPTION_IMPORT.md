# Importação Manual de Opções

## Fluxo seguro

Na página **Sistema**, seção **Importação manual de opções**:

1. selecione um CSV;
2. clique em **Validar e visualizar**;
3. confira linhas válidas, erros, avisos, campos ausentes e prévia;
4. clique em **Confirmar importação**;
5. somente após a confirmação os engines são executados;
6. a análise concluída cria o snapshot automático;
7. o Dashboard passa a usar a análise manual nesta sessão do navegador.

Prévia e arquivos inválidos não alteram o provider atual e não criam snapshot.

## Colunas

Obrigatórias:

```csv
strike,option_type,open_interest,volume
```

Opcionais:

```csv
symbol,expiration,bid,ask,last,implied_volatility,delta,gamma,theta,vega,underlying_price,timestamp,source
```

Aliases aceitos incluem `type`, `tipo`, `right`, `expiry`, `oi`, `vol`, `iv` e
`spot`.

Exemplo:

```csv
symbol,expiration,strike,option_type,volume,open_interest,implied_volatility,gamma,underlying_price,timestamp,source
XAU,2026-08-28,2400,CALL,110,1250,0.25,0.012,2412.30,2026-07-25T18:00:00Z,exportacao_autorizada
XAU,2026-08-28,2400,PUT,90,1380,27.5,0.014,2412.30,2026-07-25T18:00:00Z,exportacao_autorizada
```

O separador pode ser vírgula ou ponto e vírgula. Decimais podem usar ponto ou
vírgula; para decimal com vírgula, prefira o separador ponto e vírgula.

## Validação

- no máximo 5 MB;
- UTF-8/UTF-8 BOM ou Latin-1;
- pelo menos uma CALL e uma PUT;
- strike positivo;
- OI e volume não negativos;
- IV decimal ou percentual, positiva;
- delta entre -1 e 1;
- gamma e vega não negativos;
- datas ISO `YYYY-MM-DD`;
- timestamp ISO 8601.

Linhas inválidas são rejeitadas e identificadas no relatório. O sistema não
substitui campo obrigatório ausente nem um número inválido por zero.

Campos opcionais ausentes aparecem como aviso. Os engines preservam seu
comportamento existente; por exemplo, Expected Move continua indisponível sem
spot, IV e prazo válidos.

## API

Prévia:

```bash
curl -F "file=@options.csv" \
  "http://localhost:8000/api/market/options/import"
```

Confirmação:

```bash
curl -F "file=@options.csv" \
  "http://localhost:8000/api/market/options/import?confirm=true"
```

A confirmação deve ser explícita. A resposta carrega relatório, metadata e a
análise institucional quando importada.

## Uso legal

Importe somente arquivos que você está autorizado a usar. Não há scraping de
Cboe Delayed Quotes nem download automatizado de páginas com restrições de
automação.

