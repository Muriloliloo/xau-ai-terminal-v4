import { formatCompact, formatNumber, formatPercent } from "@/lib/formatters";
import type { OpenInterestAnalysis } from "@/types";

export function OpenInterestDistribution({
  analysis,
}: {
  analysis: OpenInterestAnalysis;
}) {
  const rows = analysis.top_10_strikes;
  if (!rows.length) {
    return (
      <p className="py-10 text-center text-sm text-terminal-muted">
        Sem Open Interest para distribuir.
      </p>
    );
  }

  const maximum = Math.max(...rows.map((row) => row.total_oi), 1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-sm bg-terminal-positive" />
          Call OI
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-sm bg-terminal-negative" />
          Put OI
        </span>
        <span>Percentual sobre OI total</span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const callShare = row.total_oi > 0 ? (row.call_oi / row.total_oi) * 100 : 0;
          const putShare = row.total_oi > 0 ? (row.put_oi / row.total_oi) * 100 : 0;
          return (
            <div
              key={row.strike}
              title={[
                `Strike ${formatNumber(row.strike)}`,
                `Call OI ${formatNumber(row.call_oi)}`,
                `Put OI ${formatNumber(row.put_oi)}`,
                `Total ${formatNumber(row.total_oi)}`,
                `Concentração ${formatPercent(row.percentage)}`,
              ].join(" · ")}
              className="grid grid-cols-[70px_minmax(0,1fr)_92px] items-center gap-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] text-terminal-text">
                  {formatNumber(row.strike)}
                </p>
                <p className="font-mono text-[8px] text-terminal-muted">#{row.rank}</p>
              </div>
              <div className="h-4 overflow-hidden rounded-sm bg-terminal-panel">
                <div
                  className="flex h-full min-w-px"
                  style={{ width: `${(row.total_oi / maximum) * 100}%` }}
                  aria-label={`Strike ${row.strike}: ${row.percentage.toFixed(1)} por cento do Open Interest`}
                >
                  <span
                    className="h-full bg-terminal-positive"
                    style={{ width: `${callShare}%` }}
                  />
                  <span
                    className="h-full bg-terminal-negative"
                    style={{ width: `${putShare}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-terminal-text">
                  {formatCompact(row.total_oi)}
                </p>
                <p className="font-mono text-[8px] text-terminal-muted">
                  {formatPercent(row.percentage)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
