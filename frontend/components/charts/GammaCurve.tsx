import { formatCompact, formatNumber } from "@/lib/formatters";
import type { GammaExposureStrike } from "@/types";

interface GammaCurveProps {
  rows: GammaExposureStrike[];
  gammaFlip: number | null;
  gammaMagnet: number | null;
}

const WIDTH = 760;
const HEIGHT = 260;
const LEFT = 64;
const RIGHT = 20;
const TOP = 22;
const BOTTOM = 42;

export function GammaCurve({
  rows,
  gammaFlip,
  gammaMagnet,
}: GammaCurveProps) {
  if (!rows.length) {
    return (
      <p className="grid h-64 place-items-center text-sm text-terminal-muted">
        Curva de Gamma indisponível.
      </p>
    );
  }

  const sortedRows = [...rows].sort((left, right) => left.strike - right.strike);
  const maximum = Math.max(...sortedRows.map((row) => Math.abs(row.net_gex)), 1);
  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const zeroY = TOP + chartHeight / 2;
  const x = (index: number) =>
    LEFT + (index / Math.max(sortedRows.length - 1, 1)) * chartWidth;
  const y = (value: number) =>
    zeroY - (value / maximum) * (chartHeight / 2);
  const points = sortedRows
    .map((row, index) => `${x(index)},${y(row.net_gex)}`)
    .join(" ");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 bg-terminal-accent" /> Net GEX
        </span>
        <span>Linha central = exposição neutra</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Curva de Gamma Exposure por strike"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-[620px] text-terminal-muted"
        >
          <line
            x1={LEFT}
            y1={zeroY}
            x2={WIDTH - RIGHT}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.35"
          />
          <text x={8} y={TOP + 4} fill="currentColor" fontSize="10">
            +{formatCompact(maximum)}
          </text>
          <text x={8} y={zeroY + 4} fill="currentColor" fontSize="10">
            0
          </text>
          <text x={8} y={HEIGHT - BOTTOM + 4} fill="currentColor" fontSize="10">
            -{formatCompact(maximum)}
          </text>
          <polyline
            points={points}
            fill="none"
            stroke="#5f9cff"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {sortedRows.map((row, index) => {
            const pointX = x(index);
            const pointY = y(row.net_gex);
            const marker =
              row.strike === gammaFlip
                ? "GF"
                : row.strike === gammaMagnet
                  ? "GM"
                  : null;
            return (
              <g key={row.strike}>
                <circle
                  cx={pointX}
                  cy={pointY}
                  r={marker ? 5 : 3.5}
                  fill={row.net_gex >= 0 ? "#45d267" : "#ff414d"}
                  stroke={marker ? "#f4d438" : "#07101d"}
                  strokeWidth={marker ? 2 : 1}
                >
                  <title>
                    {`Strike ${formatNumber(row.strike)} · Net GEX ${formatNumber(row.net_gex)}`}
                  </title>
                </circle>
                <text
                  x={pointX}
                  y={HEIGHT - 20}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="9"
                >
                  {formatNumber(row.strike)}
                </text>
                {marker ? (
                  <text
                    x={pointX}
                    y={Math.max(12, pointY - 10)}
                    textAnchor="middle"
                    fill="#f4d438"
                    fontSize="9"
                  >
                    {marker}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
