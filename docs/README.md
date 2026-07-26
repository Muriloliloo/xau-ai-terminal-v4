# Documentação do XAU AI TERMINAL

Este diretório é a fonte de verdade técnica do projeto.

## Índice

| Documento | Finalidade |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura, camadas, páginas, banco, serviços e sessão |
| [DATA_FLOW.md](DATA_FLOW.md) | Fluxo completo do CSV até a interface |
| [ENGINES.md](ENGINES.md) | Contratos e limitações de todos os engines |
| [ROADMAP.md](ROADMAP.md) | Evolução concluída e próximos ciclos |
| [CHANGELOG.md](../CHANGELOG.md) | Histórico conhecido de versões e mudanças |

## Convenções

- **Atual** significa comportamento implementado e validado.
- **Planejado** significa trabalho futuro, sem garantia de entrega ou data.
- Componentes de domínio não devem importar Streamlit ou SQLite.
- Mudanças em contratos, fórmulas, páginas ou persistência devem atualizar a
  documentação no mesmo conjunto de alterações.
- Decisões arquiteturais de impacto devem ser registradas futuramente em `docs/adr/`.
