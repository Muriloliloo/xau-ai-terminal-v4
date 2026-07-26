import { formatCompact, formatInteger, formatNumber } from "@/lib/formatters";
import type { GexStrikeRow, InstitutionalLevels } from "@/types";

interface GammaHeatmapProps {
  rows: GexStrikeRow[];
  levels?: InstitutionalLevels;
}

function levelBorder(strike: number, levels?: InstitutionalLevels) {
  if (strike === levels?.gammaFlip) return "border-terminal-flip ring-1 ring-terminal-flip/35";
  if (strike === levels?.callWall) return "border-terminal-positive";
  if (strike === levels?.putWall) return "border-terminal-negative";
  if (strike === levels?.gammaMagnet) return "border-terminal-accent";
  return "border-terminal-border";
}

function levelLabel(strike: number, levels?: InstitutionalLevels) {
  if (strike === levels?.gammaFlip) return "Gamma Flip";
  if (strike === levels?.callWall) return "Call Wall";
  if (strike === levels?.putWall) return "Put Wall";
  if (strike === levels?.gammaMagnet) return "Gamma Magnet";
  return null;
}

export function GammaHeatmap({ rows, levels }: GammaHeatmapProps) {
  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-terminal-muted">Sem dados de gamma.</p>;
  }

  const sortedRows = [...rows].sort((left, right) => left.strike - right.strike);
  const max = Math.max(...sortedRows.map((row) => Math.abs(row.net_gex)), 1);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {sortedRows.map((row) => {
        const ratio = Math.abs(row.net_gex) / max;
        const intensity = 0.08 + ratio * 0.34;
        const positive = row.net_gex >= 0;
        const isNeutral = ratio < 0.06;
        const marker = levelLabel(row.strike, levels);
        const tooltip = [
          `Strike: ${formatNumber(row.strike)}`,
          `Call GEX: ${formatNumber(row.call_gex)}`,
          `Put GEX: ${formatNumber(row.put_gex)}`,
          `Net GEX: ${formatNumber(row.net_gex)}`,
          `Open Interest: ${formatInteger(row.open_interest)}`,
          `Volume: ${formatInteger(row.volume)}`,
        ].join(" · ");

        return (
          <div
            key={row.strike}
            title={tooltip}
            className={`min-w-0 rounded-md border px-2.5 py-2 ${levelBorder(
              row.strike,
              levels,
            )}`}
            style={{
              backgroundColor: isNeutral
                ? "rgb(14 29 48)"
                : positive
                  ? `rgb(69 210 103 / ${intensity})`
                  : `rgb(255 65 77 / ${intensity})`,
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <p className="font-mono text-[10px] text-terminal-muted">
                {formatNumber(row.strike)}
              </p>
              {marker ? (
                <span className="truncate font-mono text-[8px] uppercase text-terminal-text">
                  {marker}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate font-mono text-xs font-semibold text-terminal-text">
              {formatCompact(row.net_gex)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
