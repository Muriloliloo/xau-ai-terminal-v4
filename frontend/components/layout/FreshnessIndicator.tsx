"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/cards/StatusBadge";
import type { FreshnessType } from "@/types";

function freshness(
  generatedAt: string | null | undefined,
  now: number,
  freshnessType?: FreshnessType,
  delayMinutes?: number | null,
): { label: string; tone: "positive" | "warning" | "negative" | "neutral" } {
  if (freshnessType === "demo") {
    return { label: "DADOS DEMONSTRATIVOS", tone: "warning" };
  }
  if (freshnessType === "manual") {
    return { label: "DADOS MANUAIS", tone: "warning" };
  }
  if (freshnessType === "delayed") {
    return {
      label:
        delayMinutes == null
          ? "DADOS ATRASADOS"
          : `DADOS ATRASADOS · ~${delayMinutes} MIN`,
      tone: "warning",
    };
  }
  if (freshnessType === "end_of_day") {
    return { label: "FECHAMENTO DIÁRIO", tone: "neutral" };
  }
  if (freshnessType === "historical") {
    return { label: "DADOS HISTÓRICOS", tone: "neutral" };
  }
  if (freshnessType === "unavailable") {
    return { label: "DADOS INDISPONÍVEIS", tone: "negative" };
  }
  if (freshnessType === "realtime") {
    return { label: "DADOS EM TEMPO REAL", tone: "positive" };
  }
  if (!generatedAt) return { label: "Indisponível", tone: "neutral" };

  const timestamp = new Date(generatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return { label: "Atualização inválida", tone: "negative" };
  }

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) {
    return {
      label:
        `Processado há ${Math.max(1, seconds)}s`,
      tone: "neutral",
    };
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 5) {
    return {
      label:
        `Processado há ${minutes} min`,
      tone: "warning",
    };
  }

  return { label: "Dados antigos", tone: "negative" };
}

export function FreshnessIndicator({
  generatedAt,
  freshnessType,
  delayMinutes,
}: {
  generatedAt: string | null | undefined;
  freshnessType?: FreshnessType;
  delayMinutes?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const state = freshness(generatedAt, now, freshnessType, delayMinutes);
  return <StatusBadge label={state.label} tone={state.tone} />;
}
