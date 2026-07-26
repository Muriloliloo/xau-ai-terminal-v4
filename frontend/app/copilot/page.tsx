import type { Metadata } from "next";

import { CopilotWorkspace } from "@/components/copilot/CopilotWorkspace";

export const metadata: Metadata = {
  title: "Institutional Copilot",
};

export default function CopilotPage() {
  return <CopilotWorkspace />;
}
