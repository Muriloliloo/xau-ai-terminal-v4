# Snapshots institucionais

## Objetivo

Importações CME `open_interest_only` são registros de fechamento auditáveis em
`cme_bulletin_imports`; elas não criam snapshot institucional enquanto não
houver dados suficientes para a análise completa. Se uma fonte CME futura for
elegível para snapshot, a metadata deverá preservar provider, `bulletin_date`,
`freshness_type=end_of_day`, hash, validação, warnings e alinhamento com spot.

Cada análise concluída por `POST /api/analysis/demo` ou
`POST /api/analysis/upload` é persistida automaticamente. O registro conserva o
JSON integral de `AnalysisResponse`, portanto o dashboard pode ser reconstruído
sem executar novamente Gamma, Dealer ou qualquer outro engine quantitativo.

O botão **Salvar Snapshot** cria uma cópia manual do estado já exibido. Isso
permite marcar um momento importante sem impedir o histórico automático.

## Componentes

```text
SnapshotEngine (puro)
  -> SnapshotService
      -> SnapshotRepository
          -> SQLite institutional_snapshots
```

- `SnapshotEngine`: valida, normaliza, serializa, desserializa, extrai metadados
  e compara payloads;
- `SnapshotService`: coordena persistência e reconstrução Pydantic;
- `SnapshotRepository`: executa SQL parametrizado;
- `snapshots.py`: expõe os quatro endpoints HTTP.

Gamma Engine e Dealer Engine não participam da reconstrução.

## Schema SQLite

```sql
CREATE TABLE institutional_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    source_name TEXT NOT NULL,
    source_mode TEXT NOT NULL,
    is_automatic INTEGER NOT NULL,
    label TEXT,
    call_wall REAL,
    put_wall REAL,
    gamma_flip REAL,
    gamma_magnet REAL,
    gex_total REAL NOT NULL,
    net_oi REAL NOT NULL,
    regime TEXT NOT NULL,
    dealer_bias TEXT NOT NULL,
    confidence REAL NOT NULL,
    institutional_score REAL NOT NULL,
    analysis_json TEXT NOT NULL
);
```

Índice:

```sql
CREATE INDEX idx_institutional_snapshots_created_at
ON institutional_snapshots(created_at DESC, id DESC);
```

As colunas escalares atendem listagem e comparação rápida. `analysis_json`
preserva todos os cards, comentários, alertas e linhas por strike. Snapshots
criados a partir da Sprint 2 também preservam `open_interest_analysis`,
incluindo Top 10, distribuição e score HHI.

Snapshots criados a partir da Sprint 3 preservam `gamma_exposure_analysis`
integral: totais, extremos, Dealer Pressure e curva completa por strike. Não foi
necessária alteração de schema SQL porque o payload versionável reside em
`analysis_json`.

Snapshots criados a partir da Sprint 4 preservam `volatility_analysis`:
resumo IV, Expected Move e curvas por strike/vencimento. O schema SQLite
continua inalterado.

Snapshots criados a partir da Sprint 11 também preservam `data_metadata` dentro
de `analysis_json`: provider, source, freshness, atraso, coleta, timestamp de
mercado, flags demo/manual, warnings e campos ausentes. Não houve migração SQL.
Snapshots antigos retornam `data_metadata=null` e continuam reconstruindo o
dashboard.

## Fluxos

### Automático

```text
CSV -> análise -> AnalysisResponse -> create_snapshot(is_automatic=True)
    -> resposta recebe snapshot_id
```

Se a persistência falhar, a requisição de análise falha; o sistema não declara
uma análise concluída sem o snapshot obrigatório.

### Manual

```text
Dashboard -> Salvar Snapshot -> POST /api/snapshots/create
          -> cópia manual com label
```

### Reconstrução

```text
GET /api/snapshots/{id}
 -> JSON validado pelo SnapshotEngine
 -> AnalysisResponse validada por Pydantic
 -> mesmo componente Dashboard
```

### Comparação

A página `/snapshots` permite selecionar dois registros. Os detalhes são
carregados pela API e o frontend mostra mudanças de regime, GEX, Net OI, score,
confiança, walls e Gamma Flip estimado.

A comparação também mostra Call OI, Put OI, OI Concentration Score e variação
da maior concentração. Snapshots anteriores ao contrato Sprint 2 continuam
abrindo; métricas novas indisponíveis aparecem como “—”.

Na Sprint 3 a comparação passou a incluir Call GEX, Put GEX, GEX bruto, Dealer
Pressure e Gamma Magnet. Snapshots anteriores continuam compatíveis porque
`gamma_exposure_analysis` é opcional na reconstrução.

Na Sprint 4 foram adicionadas IV ponderada, Call IV, Put IV, IV Skew e Expected
Move quando disponível. `volatility_analysis` também é opcional; snapshots
antigos exibem “—” e não executam novamente o engine.

## Retenção e integridade

- listagem padrão limitada aos 100 registros mais recentes; a API aceita até
  500 por requisição;
- exclusão é individual e permanente;
- não há exclusão automática, restauração ou política de retenção nesta Sprint;
- `schema_version=1` prepara evolução futura do payload;
- não existe autenticação ou auditoria por usuário nesta versão local.
