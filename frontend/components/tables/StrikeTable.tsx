import { formatCompact, formatInteger, formatNumber } from "@/lib/formatters";
import type { InstitutionalLevels, StrikeTableRow } from "@/types";

function levelName(strike: number, levels?: InstitutionalLevels) {
  const names = [
    strike === levels?.callWall ? "Call Wall" : null,
    strike === levels?.putWall ? "Put Wall" : null,
    strike === levels?.gammaFlip ? "Gamma Flip" : null,
    strike === levels?.gammaMagnet ? "Gamma Magnet" : null,
  ].filter((name): name is string => Boolean(name));
  return names.join(" · ");
}

export function StrikeTable({
  rows,
  levels,
}: {
  rows: StrikeTableRow[];
  levels?: InstitutionalLevels;
}) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-terminal-muted">Sem strikes válidos.</p>;
  }

  const sortedRows = [...rows].sort((left, right) => left.strike - right.strike);

  return (
    <div className="max-h-[360px] overflow-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-terminal-panel">
          <tr className="border-b border-terminal-border font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
            <th className="px-2 py-2 font-medium">Strike</th>
            <th className="px-2 py-2 text-right font-medium">Call GEX</th>
            <th className="px-2 py-2 text-right font-medium">Put GEX</th>
            <th className="px-2 py-2 text-right font-medium">Net GEX</th>
            <th className="px-2 py-2 text-right font-medium">Call OI</th>
            <th className="px-2 py-2 text-right font-medium">Δ Call</th>
            <th className="px-2 py-2 text-right font-medium">Put OI</th>
            <th className="px-2 py-2 text-right font-medium">Δ Put</th>
            <th className="px-2 py-2 text-right font-medium">Net OI</th>
            <th className="px-2 py-2 text-right font-medium">Concent.</th>
            <th className="px-2 py-2 text-right font-medium">Volume</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const marker = levelName(row.strike, levels);
            return (
            <tr
              key={row.strike}
              title={marker || undefined}
              className={`border-b border-terminal-border/60 font-mono text-[11px] last:border-0 hover:bg-terminal-sidebar/60 ${
                marker ? "bg-terminal-accent/4" : ""
              }`}
            >
              <td className="px-2 py-2 text-terminal-text">
                <span>{formatNumber(row.strike)}</span>
                {marker ? (
                  <span className="ml-2 font-sans text-[8px] uppercase text-terminal-flip">
                    {marker}
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-2 text-right text-terminal-positive">
                {formatCompact(row.call_gex)}
              </td>
              <td className="px-2 py-2 text-right text-terminal-negative">
                {formatCompact(row.put_gex)}
              </td>
              <td
                className={`px-2 py-2 text-right ${
                  row.net_gex >= 0 ? "text-terminal-positive" : "text-terminal-negative"
                }`}
              >
                {formatCompact(row.net_gex)}
              </td>
              <td className="px-2 py-2 text-right text-terminal-muted">
                {formatInteger(row.call_oi)}
              </td>
              <td className={`px-2 py-2 text-right ${row.call_oi_change >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>
                {formatCompact(row.call_oi_change)}
              </td>
              <td className="px-2 py-2 text-right text-terminal-muted">
                {formatInteger(row.put_oi)}
              </td>
              <td className={`px-2 py-2 text-right ${row.put_oi_change >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>
                {formatCompact(row.put_oi_change)}
              </td>
              <td className={`px-2 py-2 text-right ${row.net_oi >= 0 ? "text-terminal-positive" : "text-terminal-negative"}`}>
                {formatCompact(row.net_oi)}
              </td>
              <td className="px-2 py-2 text-right text-terminal-muted">
                {row.concentration_pct.toFixed(1)}%
              </td>
              <td className="px-2 py-2 text-right text-terminal-muted">
                {formatInteger(row.volume)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
