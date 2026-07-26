import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "XAU AI Terminal 4.0",
    template: "%s | XAU AI Terminal 4.0",
  },
  description:
    "Dashboard institucional compacto para análise de gamma, posicionamento dealer e níveis de XAU.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
