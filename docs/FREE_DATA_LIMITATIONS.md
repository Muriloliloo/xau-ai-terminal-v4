# Limitações de Dados Gratuitos

## O que esta Sprint fornece

- spot de ouro/XAU e histórico diário por integração opcional com os endpoints
  oficiais e documentados do Alpha Vantage;
- importação manual de cadeias de opções obtidas legalmente pelo usuário;
- arquivo local autorizado;
- CSV demonstrativo como fallback explícito.

A existência de um endpoint chamado “spot” não prova, por si só, que o plano
configurado entrega dados em tempo real. Por isso o provider Alpha Vantage usa a
classificação conservadora `delayed` enquanto a latência/entitlement não estiver
comprovada.

Segundo a documentação oficial consultada em julho de 2026, o plano gratuito
padrão informa até 25 consultas diárias. Limites e planos podem mudar; confirme
sempre na página oficial: <https://www.alphavantage.co/premium/>.

## O que não está disponível gratuitamente nesta integração

- cadeia completa de opções XAU garantida em tempo real;
- `REALTIME_OPTIONS` do Alpha Vantage sem plano premium compatível;
- consolidação de múltiplas bolsas;
- garantia de baixa latência;
- SLA, entitlement profissional ou direitos de redistribuição;
- IV Rank/Percentile sem histórico próprio suficiente.

Quando o plano não oferece um recurso, a API responde:
`Recurso não disponível no plano configurado.`

## Cboe Delayed Quotes

Não existe scraping automático da página Cboe Delayed Quotes. A automação dessa
página é incompatível com as restrições publicadas para extração automatizada.
Esta decisão é deliberada e faz parte da arquitetura.

São aceitos somente:

- CSV importado manualmente por um usuário que tenha direito de utilizá-lo;
- arquivo local autorizado;
- futura API oficial, documentada e contratada.

Também não são usados endpoints privados, não documentados ou engenharia reversa
de aplicações web.

## Obrigações do usuário

O usuário é responsável por verificar licença, entitlement, redistribuição e
uso comercial de qualquer arquivo importado. O terminal registra a origem
declarada, mas não concede direitos sobre dados de terceiros.

Dados manuais, históricos, atrasados e demonstrativos não devem ser
interpretados como estado atual do mercado. O Copilot e o dashboard exibem essa
limitação junto dos resultados.

