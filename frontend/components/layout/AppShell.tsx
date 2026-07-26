import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text">
      <Sidebar />
      <main className="min-w-0 overflow-x-clip px-3 pb-8 pt-4 sm:px-5 lg:ml-60 lg:px-6 lg:py-4">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
