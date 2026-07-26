import type { Metadata } from "next";

import { InstitutionalWorkspace } from "@/components/institutional/InstitutionalWorkspace";

export const metadata: Metadata = {
  title: "Institucional",
};

export default function InstitutionalPage() {
  return <InstitutionalWorkspace />;
}
