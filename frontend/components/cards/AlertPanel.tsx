import { AlertCard } from "@/components/cards/AlertCard";
import type { MarketAlert } from "@/types";

export function AlertPanel({ alerts }: { alerts: MarketAlert[] }) {
  return (
    <aside
      aria-label="Alertas de mercado"
      className="flex max-h-[360px] min-h-0 flex-col overflow-hidden rounded-lg border border-terminal-border bg-terminal-card"
    >
      <div className="flex items-center justify-between border-b border-terminal-border px-3.5 py-3">
        <div>
          <h2 className="text-sm font-semibold">Alertas</h2>
          <p className="mt-0.5 text-[10px] text-terminal-muted">Monitoramento do snapshot</p>
        </div>
        <span className="rounded-full border border-terminal-border bg-terminal-panel px-2 py-0.5 font-mono text-[10px] text-terminal-muted">
          {alerts.length}
        </span>
      </div>
      <div className="min-h-0 space-y-2 overflow-y-auto p-2.5">
        {alerts.length ? (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <p className="p-4 text-center text-xs text-terminal-muted">
            Nenhum alerta para este snapshot.
          </p>
        )}
      </div>
    </aside>
  );
}
