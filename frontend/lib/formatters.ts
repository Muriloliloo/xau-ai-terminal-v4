const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const signedPercentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const UNAVAILABLE_LABEL = "Indisponível";

export function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? UNAVAILABLE_LABEL
    : decimalFormatter.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? UNAVAILABLE_LABEL
    : compactFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? UNAVAILABLE_LABEL
    : `${percentFormatter.format(value)}%`;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return UNAVAILABLE_LABEL;
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${signedPercentFormatter.format(value)}%`;
}

export function formatInteger(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? UNAVAILABLE_LABEL
    : integerFormatter.format(value);
}

export function formatTimestamp(value: string | null): string {
  if (!value) return UNAVAILABLE_LABEL;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? UNAVAILABLE_LABEL
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return UNAVAILABLE_LABEL;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? UNAVAILABLE_LABEL
    : new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
}
