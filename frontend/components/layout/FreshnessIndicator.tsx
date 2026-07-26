"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/cards/StatusBadge";

function freshness(
  generatedAt: string | null | undefined,
  now: number,
): { label: string; tone: "positive" | "warning" | "negative" | "neutral" } {
  if (!generatedAt) return { label: "Sem atualização", tone: "neutral" };

  const timestamp = new Date(generatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return { label: "Atualização inválida", tone: "negative" };
  }

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) {
    return {
      label: seconds < 5 ? "Atualizado agora" : `Atualizado há ${seconds}s`,
      tone: "positive",
    };
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 5) {
    return {
      label: `Atualizado há ${minutes} min`,
      tone: "warning",
    };
  }

  return { label: "Dados antigos", tone: "negative" };
}

export function FreshnessIndicator({
  generatedAt,
}: {
  generatedAt: string | null | undefined;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const state = freshness(generatedAt, now);
  return <StatusBadge label={state.label} tone={state.tone} />;
}
