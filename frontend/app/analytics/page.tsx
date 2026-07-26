import type { Metadata } from "next";

import { AnalyticsWorkspace } from "@/components/charts/AnalyticsWorkspace";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsWorkspace />;
}
