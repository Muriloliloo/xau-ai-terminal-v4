export const SYSTEM_NAME = "XAU AI TERMINAL";
export const SYSTEM_VERSION = "4.0 Web";
export const ASSET_SYMBOL = "XAUUSD";
export const LOW_CONFIDENCE_THRESHOLD = 60;

export const NAVIGATION = [
  { href: "/", label: "Dashboard", shortLabel: "Home" },
  {
    href: "/copilot",
    label: "✦ Institutional Copilot",
    shortLabel: "Copilot",
  },
  { href: "/institutional", label: "Institucional", shortLabel: "Institucional" },
  {
    href: "/academy",
    label: "Institutional Academy",
    shortLabel: "Academy",
  },
  { href: "/heatmap", label: "Mapa GEX", shortLabel: "GEX" },
  { href: "/analytics", label: "Analytics", shortLabel: "Analytics" },
  { href: "/history", label: "Histórico", shortLabel: "Histórico" },
  { href: "/snapshots", label: "Snapshots", shortLabel: "Snapshots" },
  { href: "/replay", label: "▶ Market Replay", shortLabel: "Replay" },
  { href: "/favorites", label: "★ Favoritos", shortLabel: "Favoritos" },
  { href: "/system", label: "Sistema", shortLabel: "Sistema" },
  { href: "/preferences", label: "Preferences", shortLabel: "Preferências" },
  { href: "/settings", label: "Configurações", shortLabel: "Ajustes" },
] as const;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
