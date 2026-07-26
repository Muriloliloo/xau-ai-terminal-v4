import type { Metadata } from "next";

import { AcademyWorkspace } from "@/components/academy/AcademyWorkspace";

export const metadata: Metadata = {
  title: "Institutional Academy",
};

export default function AcademyPage() {
  return <AcademyWorkspace />;
}
