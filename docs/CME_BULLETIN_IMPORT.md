# Importação do CME Daily Bulletin

## Escopo

O importador processa exclusivamente um PDF local, enviado manualmente pelo
usuário, do **CME Group Daily Information Bulletin — Section 64: Metals Option
Products**. A integração é de fechamento diário (`end_of_day`): não é tempo
real, intradiária nem um feed automático.

Não foram implementados scraping, crawler, automação de navegador, download
automático, endpoint não documentado ou contorno de autenticação. O PDF bruto
não é salvo no SQLite nem retornado pela API.

> Este importador processa somente arquivos fornecidos manualmente pelo usuário.
> O uso, armazenamento, processamento e distribuição dos dados deve respeitar
> os termos e licenças aplicáveis da CME Group.

## Fluxo operacional

1. Abra **Sistema**.
2. Em **CME Daily Bulletin**, selecione um PDF.
3. Clique em **Validar e visualizar**.
4. Revise data, hash, contagens, amostra, warnings e elegibilidade.
5. Confirme a importação.
6. Abra o Dashboard para ver somente os componentes compatíveis.

O preview fica apenas em memória, possui TTL, limite de itens e não altera
provider, engines, banco ou snapshots. A confirmação usa exatamente o resultado
validado, persiste metadata/contratos normalizados, invalida o `preview_id` e
executa apenas engines autorizados pelo gate.

Um SHA-256 repetido é informado no preview. Novo registro exige a marcação
explícita de reprocessamento e referencia o id anterior.

## Endpoints

| Método | Rota | Comportamento |
|---|---|---|
| POST | `/api/market/cme-bulletin/preview` | Recebe multipart PDF e retorna prévia sem persistir |
| POST | `/api/market/cme-bulletin/confirm` | Confirma um `preview_id` elegível |
| GET | `/api/market/cme-bulletin/status` | Limites, cache e última importação |
| GET | `/api/market/cme-bulletin/latest` | Última importação confirmada |

Limites configuráveis:

```dotenv
CME_BULLETIN_MAX_BYTES=10000000
CME_BULLETIN_MAX_PAGES=100
CME_BULLETIN_MAX_SECONDS=120
CME_BULLETIN_PREVIEW_TTL_SECONDS=900
CME_BULLETIN_MAX_PREVIEWS=5
```

Somente `application/pdf` é aceito. O nome é reduzido ao basename, sanitizado e
limitado a 180 caracteres. Erros públicos não incluem caminhos, stack traces ou
conteúdo integral.

## Auditoria do arquivo de referência

Arquivo: `docs/samples/CME_Metals_Options_2026-07-24.pdf`

- SHA-256:
  `f5775301f1de62b5a322c19b4c9423f7f0fb3b26439a7382dd96a70ad22f4873`;
- 67 páginas, Bulletin #141, `FINAL`, sexta-feira 24/07/2026;
- texto nativo extraível; OCR não foi necessário;
- páginas 1–43 e 67 contêm texto de produtos GOLD (as páginas 41–43 são
  blocos semanais/micro auditados, mas não inferidos);
- página 1: aviso, legenda de preços e tabela de Last Trade Dates;
- páginas 2–36: blocos explícitos `OG* CALL/PUT` consumidos;
- páginas 37–43: semanais/micro sem tipo CALL/PUT explícito no cabeçalho,
  ignorados sem inferência;
- página 67: `OPTIONS EOO'S AND BLOCKS`, auditada e excluída da cadeia para
  evitar dupla contagem;
- prata, cobre, platina e demais produtos são ignorados.

Resultado reproduzível:

| Métrica | Valor |
|---|---:|
| Contratos mínimos válidos | 4.397 |
| Calls | 2.242 |
| Puts | 2.155 |
| Com Open Interest | 4.389 |
| Com volume reportado | 923 |
| Com Delta | 3.812 |
| Com settlement | 4.397 |
| Com Gamma | 0 |
| Vencimento exato ausente | 26 |
| Duplicidades | 0 |
| OI total elegível | 670.278 |

Status: `partial`. Elegibilidade: `open_interest_only`.

## Produtos confirmados

| Código | Tipo | Contratos |
|---|---|---:|
| OG | CALL | 2.072 |
| OG | PUT | 1.980 |
| OG1 | CALL | 25 |
| OG1 | PUT | 29 |
| OG2 | CALL | 16 |
| OG2 | PUT | 19 |
| OG4 | CALL | 98 |
| OG4 | PUT | 99 |
| OG5 | CALL | 31 |
| OG5 | PUT | 28 |

Os aliases são aceitos somente no formato confirmado
`OG`, `OG1`, `OG2`, `OG4` ou `OG5` + `CALL/PUT` + `GOLD OPTIONS` ou
`COMEX GOLD OPTIONS`. Não há alias genérico que possa capturar outro metal.

## Persistência

A tabela `cme_bulletin_imports` armazena hash, nome sanitizado, datas, status,
elegibilidade, relatório, alinhamento de spot, contratos normalizados e análise
de OI em JSON. O PDF não é armazenado.

O arquivo atual produz apenas `open_interest_only`; portanto, a API não cria um
`institutional_snapshot`, pois seu contrato exige uma análise institucional
completa. A importação confirmada é o registro auditável de fechamento e o
frontend desabilita o botão de Snapshot com o motivo. Se um boletim futuro
atingir `full_analysis_allowed`, a integração deve montar uma
`AnalysisResponse` completa e então usar o Snapshot Service existente, sem
preencher campos ausentes.

## Testes

```powershell
python -m pytest backend/tests/test_cme_bulletin.py `
  backend/tests/test_cme_bulletin_api.py
```

As fixtures mínimas estão em `tests/fixtures/cme_bulletin/`. O teste principal
também processa o PDF real e valida hash, páginas, códigos e contagens.

## Publicação

Antes de publicar ou distribuir o repositório:

1. confirme que a licença permite manter o arquivo de exemplo;
2. se não permitir, remova
   `docs/samples/CME_Metals_Options_2026-07-24.pdf`;
3. mantenha as fixtures textuais mínimas somente se compatíveis com os termos;
4. não exponha a rota de arquivos estáticos para a pasta `docs/samples`;
5. preserve os avisos legais na UI e documentação.
