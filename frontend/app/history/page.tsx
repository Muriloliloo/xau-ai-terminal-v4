import type { Metadata } from "next";

import { HistoryWorkspace } from "@/components/tables/HistoryWorkspace";

export const metadata: Metadata = {
  title: "Histórico",
};

export default function HistoryPage() {
  return <HistoryWorkspace />;
}
