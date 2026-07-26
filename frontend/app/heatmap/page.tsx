import type { Metadata } from "next";

import { HeatmapWorkspace } from "@/components/charts/HeatmapWorkspace";

export const metadata: Metadata = {
  title: "Heatmap",
};

export default function HeatmapPage() {
  return <HeatmapWorkspace />;
}
