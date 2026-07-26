import { formatCompact, formatNumber } from "@/lib/formatters";
import type { GexStrikeRow, InstitutionalLevels } from "@/types";

interface GexProfileProps {
  rows: GexStrikeRow[];
  levels?: InstitutionalLevels;
}

function levelMarkers(strike: number, levels?: InstitutionalLevels) {
  if (!levels) return [];
  return [
    strike === levels.callWall ? "CW" : null,
    strike === levels.putWall ? "PW" : null,
    strike === levels.gammaFlip ? "GF" : null,
    strike === levels.gammaMagnet ? "GM" : null,
  ].filter((marker): marker is string => Boolean(marker));
}

function rowHighlight(strike: number, levels?: InstitutionalLevels) {
  if (strike === levels?.gammaFlip) return "bg-terminal-flip/5";
  if (strike === levels?.callWall) return "bg-terminal-positive/5";
  if (strike === levels?.putWall) return "bg-terminal-negative/5";
  if (strike === levels?.gammaMagnet) return "bg-terminal-accent/5";
  return "";
}

export function GexProfile({ rows, levels }: GexProfileProps) {
  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-terminal-muted">Sem dados de GEX.</p>;
  }

  const sortedRows = [...rows].sort((left, right) => left.strike - right.strike);
  const max = Math.max(
    ...sortedRows.flatMap((row) => [Math.abs(row.call_gex), Math.abs(row.put_gex)]),
    1,
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 bg-terminal-negative" /> Put GEX
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 bg-terminal-positive" /> Call GEX
        </span>
        <span>CW / PW / GF / GM = níveis institucionais</span>
      </div>
      <div className="max-h-[340px] overflow-y-auto pr-1">
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] bg-terminal-card pb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
          <span className="text-right">Put GEX</span>
          <span className="text-center">Strike</span>
          <span>Call GEX</span>
        </div>
        <div className="space-y-1">
          {sortedRows.map((row) => {
            const markers = levelMarkers(row.strike, levels);
            const tooltip = [
              `Strike ${formatNumber(row.strike)}`,
              `Put GEX ${formatNumber(row.put_gex)}`,
              `Call GEX ${formatNumber(row.call_gex)}`,
              `Net GEX ${formatNumber(row.net_gex)}`,
            ].join(" · ");

            return (
              <div
                key={row.strike}
                title={tooltip}
                className={`grid min-h-7 grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center rounded-sm ${rowHighlight(
                  row.strike,
                  levels,
                )}`}
              >
                <div className="flex h-2.5 items-center justify-end border-r border-terminal-border">
                  <div
                    className="h-1.5 rounded-l-sm bg-terminal-negative/80"
                    style={{ width: `${(Math.abs(row.put_gex) / max) * 100}%` }}
                  />
                </div>
                <div className="flex flex-col items-center px-1">
                  <span className="font-mono text-[10px] text-terminal-text">
                    {formatNumber(row.strike)}
                  </span>
                  {markers.length ? (
                    <span className="font-mono text-[8px] leading-none text-terminal-flip">
                      {markers.join(" · ")}
                    </span>
                  ) : null}
                </div>
                <div className="h-2.5 border-l border-terminal-border">
                  <div
                    className="h-1.5 rounded-r-sm bg-terminal-positive/80"
                    style={{ width: `${(Math.abs(row.call_gex) / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-terminal-muted">
        <span>-{formatCompact(max)}</span>
        <span className="text-terminal-border">0</span>
        <span>+{formatCompact(max)}</span>
      </div>
    </div>
  );
}
