import { formatCompact, formatNumber, formatPercent } from "@/lib/formatters";
import type {
  GammaExposureStrike,
  GexStrikeRow,
  InstitutionalLevels,
} from "@/types";

type GexMapRow = GammaExposureStrike | GexStrikeRow;

interface GexMapProps {
  rows: GexMapRow[];
  levels?: InstitutionalLevels;
}

function levelBorder(strike: number, levels?: InstitutionalLevels) {
  if (strike === levels?.gammaFlip) {
    return "border-terminal-flip ring-1 ring-terminal-flip/35";
  }
  if (strike === levels?.callWall) return "border-terminal-positive";
  if (strike === levels?.putWall) return "border-terminal-negative";
  if (strike === levels?.gammaMagnet) return "border-terminal-accent";
  return "border-terminal-border";
}

function levelLabel(strike: number, levels?: InstitutionalLevels) {
  if (strike === levels?.gammaFlip) return "GF";
  if (strike === levels?.callWall) return "CW";
  if (strike === levels?.putWall) return "PW";
  if (strike === levels?.gammaMagnet) return "GM";
  return null;
}

function contribution(row: GexMapRow, grossTotal: number) {
  return "contribution_pct" in row
    ? row.contribution_pct
    : grossTotal > 0
      ? ((Math.abs(row.call_gex) + Math.abs(row.put_gex)) / grossTotal) * 100
      : 0;
}

export function GexMap({ rows, levels }: GexMapProps) {
  if (!rows.length) {
    return (
      <p className="py-10 text-center text-sm text-terminal-muted">
        Sem dados para o mapa GEX.
      </p>
    );
  }

  const sortedRows = [...rows].sort((left, right) => left.strike - right.strike);
  const maximum = Math.max(...sortedRows.map((row) => Math.abs(row.net_gex)), 1);
  const grossTotal = sortedRows.reduce(
    (total, row) => total + Math.abs(row.call_gex) + Math.abs(row.put_gex),
    0,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
        <span>Verde: pressão supressiva</span>
        <span>Vermelho: pressão amplificadora</span>
        <span>GF / CW / PW / GM: níveis</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {sortedRows.map((row) => {
          const ratio = Math.abs(row.net_gex) / maximum;
          const opacity = 0.08 + ratio * 0.38;
          const neutral = ratio < 0.06;
          const marker = levelLabel(row.strike, levels);
          const share = contribution(row, grossTotal);

          return (
            <article
              key={row.strike}
              title={[
                `Strike ${formatNumber(row.strike)}`,
                `Call GEX ${formatNumber(row.call_gex)}`,
                `Put GEX ${formatNumber(row.put_gex)}`,
                `Net GEX ${formatNumber(row.net_gex)}`,
                `Participação ${formatPercent(share)}`,
              ].join(" · ")}
              className={`min-w-0 rounded-md border p-2.5 ${levelBorder(
                row.strike,
                levels,
              )}`}
              style={{
                backgroundColor: neutral
                  ? "rgb(14 29 48)"
                  : row.net_gex > 0
                    ? `rgb(69 210 103 / ${opacity})`
                    : `rgb(255 65 77 / ${opacity})`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-terminal-muted">
                  {formatNumber(row.strike)}
                </span>
                {marker ? (
                  <span className="font-mono text-[9px] text-terminal-flip">
                    {marker}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-terminal-text">
                {formatCompact(row.net_gex)}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded bg-terminal-background/60">
                <div
                  className={row.net_gex >= 0 ? "h-full bg-terminal-positive" : "h-full bg-terminal-negative"}
                  style={{ width: `${Math.max(2, share)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[9px] text-terminal-muted">
                {formatPercent(share)} do GEX bruto
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
