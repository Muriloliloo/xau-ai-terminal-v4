"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_ITEMS = [
  {
    label: "Gamma Exposure",
    keywords: "gamma gex curva exposure",
    href: "/heatmap",
    group: "Análise",
  },
  {
    label: "Dealer Report",
    keywords: "dealer bias market maker institucional",
    href: "/institutional#dealer",
    group: "Análise",
  },
  {
    label: "Market Replay",
    keywords: "replay timeline snapshots",
    href: "/replay",
    group: "Workspace",
  },
  {
    label: "Heatmap GEX",
    keywords: "heatmap mapa gex gamma",
    href: "/heatmap",
    group: "Análise",
  },
  {
    label: "Open Interest",
    keywords: "oi open interest concentração",
    href: "/#open-interest",
    group: "Indicador",
  },
  {
    label: "Analytics",
    keywords: "analytics métricas perfil",
    href: "/analytics",
    group: "Workspace",
  },
  {
    label: "Gamma Flip",
    keywords: "gamma flip nível hedge",
    href: "/#gamma-levels",
    group: "Indicador",
  },
  {
    label: "Favoritos",
    keywords: "favoritos indicadores estrela",
    href: "/favorites",
    group: "Workspace",
  },
  {
    label: "Institutional Academy",
    keywords: "academy aprender educação indicadores tour",
    href: "/academy",
    group: "Educação",
  },
] as const;

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.keywords}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div
      className="relative w-full max-w-xl"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label className="relative block">
        <span className="sr-only">Pesquisar no terminal</span>
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-terminal-muted"
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              navigate(results[0].href);
            }
          }}
          placeholder="Pesquisar Gamma, Dealer, Replay, OI…"
          className="h-9 w-full rounded-md border border-terminal-border bg-terminal-bg/60 pl-8 pr-16 text-xs text-terminal-text placeholder:text-terminal-muted focus:border-terminal-accent/60"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="global-search-results"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-terminal-border px-1.5 py-0.5 font-mono text-[9px] text-terminal-muted">
          Ctrl K
        </kbd>
      </label>

      {open ? (
        <div
          id="global-search-results"
          role="listbox"
          className="workspace-fade absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-md border border-terminal-border bg-terminal-panel p-1.5 shadow-2xl"
        >
          {results.length ? (
            results.map((item) => (
              <button
                key={`${item.href}-${item.label}`}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigate(item.href)}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-terminal-text transition-colors duration-150 hover:bg-terminal-accent/10"
              >
                <span>{item.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
                  {item.group}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs text-terminal-muted">
              Nenhum componente encontrado.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
