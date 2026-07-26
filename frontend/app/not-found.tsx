import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon="404"
      title="Página não encontrada"
      description="A rota solicitada não existe no XAU AI Terminal."
      action={
        <Link
          href="/"
          className="inline-flex rounded-md border border-terminal-accent/40 bg-terminal-accent/10 px-3 py-2 text-xs font-semibold text-terminal-accent"
        >
          Voltar ao Dashboard
        </Link>
      }
    />
  );
}
