# Roadmap técnico

O documento principal e atualizável de produto é
[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md).

Ele define:

- missão, visão e pilares;
- estado real da Foundation;
- validação operacional ainda pendente;
- escopo V5 e V6;
- dependências;
- progresso declarativo;
- riscos, limitações e critérios de conclusão;
- visão futura sem datas ou compromissos artificiais.

Este arquivo permanece como índice técnico para evitar duplicação entre
roadmaps.

## Estado da implementação

O Sprint 12 — CME Daily Bulletin Importer — está implementado como provider
manual de fechamento diário. A integração não faz scraping/download, não é
tempo real e só libera engines mediante validação de campos.

- Foundation V4: concluída no código e nas suítes automatizadas;
- Alpha Vantage com chave válida e deploys externos: em validação operacional;
- V5.0 Institutional Data: em desenvolvimento inicial, apoiado pelo importador
  manual já existente;
- V5.2, V5.5, V5.7 e V6.0: planejados;
- V6.5 Market Journal: futuro.

## Dependências técnicas prioritárias

1. validar provider externo e deploys com evidência operacional;
2. tornar importação universal, reproduzível e historicamente rastreável;
3. classificar qualidade e compatibilidade antes dos engines;
4. especificar e validar a fórmula versionada de confiança;
5. ampliar o Copilot somente após dados e confiança auditáveis;
6. implementar segurança, persistência e observabilidade antes da beta;
7. construir o Journal sobre identidade, snapshots e retenção estáveis.

## Governança

O progresso em `frontend/lib/productRoadmap.ts` é declarado manualmente. Uma
fase não pode ser marcada como concluída apenas porque arquivos com nomes
relacionados existem.

Para concluir uma fase:

- critérios devem possuir evidência;
- dependências devem estar atendidas;
- testes relevantes devem passar;
- riscos e limitações devem estar documentados;
- contratos existentes devem permanecer compatíveis ou ter migração explícita;
- dados atrasados, manuais ou demonstrativos não podem ser descritos como tempo
  real.

## Backlog técnico transversal

Itens que atravessam várias versões:

- migrações formais e política de retenção;
- backup e restauração;
- versionamento dos engines e metodologias;
- logs estruturados, métricas e tracing;
- circuit breaker para providers externos;
- autenticação e isolamento;
- dataset quantitativo independente;
- CI/CD verificável;
- revisão de licenças e entitlement de dados.

Decisões de produto, fases e critérios detalhados devem ser atualizados somente
em [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) e no modelo declarativo do frontend.
