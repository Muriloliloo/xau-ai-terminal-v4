import type { Metadata } from "next";

import { RoadmapWorkspace } from "@/components/roadmap/RoadmapWorkspace";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "Evolução declarativa da plataforma XAU AI Terminal, com dependências, critérios e limitações.",
};

export default function RoadmapPage() {
  return <RoadmapWorkspace />;
}
