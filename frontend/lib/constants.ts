export const SYSTEM_NAME = "XAU AI TERMINAL";
export const SYSTEM_VERSION = "4.0 Web";
export const ASSET_SYMBOL = "XAUUSD";
export const LOW_CONFIDENCE_THRESHOLD = 60;

export const NAVIGATION = [
  { href: "/", label: "Dashboard", shortLabel: "Home" },
  { href: "/institutional", label: "Institucional", shortLabel: "Institucional" },
  { href: "/heatmap", label: "Mapa GEX", shortLabel: "GEX" },
  { href: "/analytics", label: "Analytics", shortLabel: "Analytics" },
  { href: "/history", label: "Histórico", shortLabel: "Histórico" },
  { href: "/snapshots", label: "Snapshots", shortLabel: "Snapshots" },
  { href: "/replay", label: "▶ Market Replay", shortLabel: "Replay" },
  { href: "/settings", label: "Configurações", shortLabel: "Ajustes" },
] as const;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
