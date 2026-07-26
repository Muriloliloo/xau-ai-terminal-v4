"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  API_BASE_URL,
  NAVIGATION,
  SYSTEM_NAME,
  SYSTEM_VERSION,
} from "@/lib/constants";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-terminal-border bg-terminal-sidebar lg:flex">
        <div className="border-b border-terminal-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-terminal-flip/40 bg-terminal-flip/10 font-mono text-sm font-bold text-terminal-flip">
              XAU
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-terminal-text">
                AI TERMINAL
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-terminal-muted">
                {SYSTEM_VERSION}
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3 py-4">
          {NAVIGATION.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                  active
                    ? "border-terminal-accent/45 bg-terminal-accent/10 text-terminal-text"
                    : "border-transparent text-terminal-muted hover:border-terminal-border hover:bg-terminal-card hover:text-terminal-text"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    active ? "bg-terminal-accent" : "bg-terminal-border"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-terminal-border px-4 py-4">
          <div className="rounded-md border border-terminal-border bg-terminal-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-terminal-muted">API alvo</span>
              <span className="flex items-center gap-1.5 text-terminal-accent">
                <span className="size-1.5 rounded-full bg-terminal-accent" />
                Configurada
              </span>
            </div>
            <p
              title={API_BASE_URL}
              className="mt-2 truncate font-mono text-[10px] text-terminal-muted"
            >
              {API_BASE_URL}
            </p>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-20 -mt-4 mb-4 rounded-b-md border border-t-0 border-terminal-border bg-terminal-sidebar/95 px-3 py-3 backdrop-blur sm:px-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold tracking-[0.1em]">{SYSTEM_NAME}</span>
          <nav aria-label="Navegação móvel" className="flex gap-1 overflow-x-auto">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded px-2 py-1.5 text-[11px] ${
                  isActive(pathname, item.href)
                    ? "bg-terminal-accent/15 text-terminal-accent"
                    : "text-terminal-muted"
                }`}
              >
                {item.shortLabel}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
