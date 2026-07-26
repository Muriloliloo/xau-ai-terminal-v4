"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="A página encontrou um erro inesperado."
      message="O Dashboard e os dados permanecem preservados. Tente carregar esta página novamente."
      onRetry={reset}
    />
  );
}
