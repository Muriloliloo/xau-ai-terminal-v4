import type { Metadata } from "next";

import { SystemWorkspace } from "@/components/workspace/SystemWorkspace";

export const metadata: Metadata = {
  title: "Sistema",
};

export default function SystemPage() {
  return <SystemWorkspace />;
}
