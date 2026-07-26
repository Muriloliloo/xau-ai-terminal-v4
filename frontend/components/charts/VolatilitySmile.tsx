import {
  formatNumber,
  formatPercent,
  UNAVAILABLE_LABEL,
} from "@/lib/formatters";
import type { VolatilityCurvePoint } from "@/types";

interface VolatilitySmileProps {
  rows: VolatilityCurvePoint[];
}

const WIDTH = 760;
const HEIGHT = 300;
const LEFT = 58;
const RIGHT = 22;
const TOP = 24;
const BOTTOM = 46;

function finite(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function VolatilitySmile({ rows }: VolatilitySmileProps) {
  const expiries = [
    ...new Set(rows.map((row) => row.expiry).filter(Boolean)),
  ].sort();
  const selectedExpiry = expiries[0] ?? null;
  const selected = rows
    .filter((row) => (selectedExpiry ? row.expiry === selectedExpiry : true))
    .sort((left, right) => left.strike - right.strike);
  const values = selected.flatMap((row) =>
    [row.call_iv, row.put_iv].filter(finite),
  );
  const callPoints = selected.filter((row) => finite(row.call_iv));
  const putPoints = selected.filter((row) => finite(row.put_iv));
  const sufficient =
    selected.length >= 2 && (callPoints.length >= 2 || putPoints.length >= 2);
  const partialWarning =
    callPoints.length < 2
      ? "Calls sem IV suficiente"
      : putPoints.length < 2
        ? "Puts sem IV suficiente"
        : null;

  if (!sufficient || values.length === 0) {
    return (
      <div className="grid h-56 place-items-center rounded-md border border-dashed border-terminal-border bg-terminal-panel/40 px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-terminal-text">
            Dados de IV insuficientes
          </p>
          <p className="mt-2 text-xs leading-5 text-terminal-muted">
            São necessários ao menos dois strikes com IV válida para desenhar o
            Volatility Smile.
          </p>
        </div>
      </div>
    );
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.15, 0.25);
  const lower = minimum - padding;
  const upper = maximum + padding;
  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const strikeMinimum = Math.min(...selected.map((row) => row.strike));
  const strikeMaximum = Math.max(...selected.map((row) => row.strike));
  const x = (strike: number) =>
    LEFT
    + ((strike - strikeMinimum) / Math.max(strikeMaximum - strikeMinimum, 1))
      * chartWidth;
  const y = (iv: number) =>
    TOP + ((upper - iv) / Math.max(upper - lower, 0.01)) * chartHeight;
  const polyline = (
    points: VolatilityCurvePoint[],
    field: "call_iv" | "put_iv",
  ) =>
    points
      .map((row) => `${x(row.strike)},${y(row[field] as number)}`)
      .join(" ");

  return (
    <div className="max-h-[320px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 font-mono text-[9px] uppercase tracking-[0.1em] text-terminal-muted">
          <span className="flex items-center gap-1">
            <span className="h-px w-4 bg-terminal-positive" /> Call IV
          </span>
          <span className="flex items-center gap-1">
            <span className="h-px w-4 bg-terminal-negative" /> Put IV
          </span>
        </div>
        <div className="text-right font-mono text-[9px]">
          <span className="text-terminal-muted">
            Vencimento: {selectedExpiry ?? UNAVAILABLE_LABEL}
          </span>
          {partialWarning ? (
            <span className="ml-2 text-terminal-flip">{partialWarning}</span>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Volatility Smile por strike"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[270px] min-w-[620px] text-terminal-muted"
        >
          {[lower, (lower + upper) / 2, upper].map((tick) => (
            <g key={tick}>
              <line
                x1={LEFT}
                x2={WIDTH - RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                strokeOpacity="0.18"
              />
              <text
                x={LEFT - 8}
                y={y(tick) + 3}
                textAnchor="end"
                fill="currentColor"
                fontSize="9"
              >
                {formatPercent(tick)}
              </text>
            </g>
          ))}
          {callPoints.length >= 2 ? (
            <polyline
              points={polyline(callPoints, "call_iv")}
              fill="none"
              stroke="#45d267"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ) : null}
          {putPoints.length >= 2 ? (
            <polyline
              points={polyline(putPoints, "put_iv")}
              fill="none"
              stroke="#ff414d"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ) : null}
          {selected.map((row) => (
            <g key={`${row.expiry ?? "none"}-${row.strike}`}>
              <text
                x={x(row.strike)}
                y={HEIGHT - 20}
                textAnchor="middle"
                fill="currentColor"
                fontSize="9"
              >
                {formatNumber(row.strike)}
              </text>
              {finite(row.call_iv) ? (
                <circle
                  cx={x(row.strike)}
                  cy={y(row.call_iv)}
                  r="3"
                  fill="#45d267"
                >
                  <title>
                    {`Strike ${formatNumber(row.strike)} · Call IV ${formatPercent(row.call_iv)}`}
                  </title>
                </circle>
              ) : null}
              {finite(row.put_iv) ? (
                <circle
                  cx={x(row.strike)}
                  cy={y(row.put_iv)}
                  r="3"
                  fill="#ff414d"
                >
                  <title>
                    {`Strike ${formatNumber(row.strike)} · Put IV ${formatPercent(row.put_iv)}`}
                  </title>
                </circle>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
