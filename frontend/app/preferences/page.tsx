import type { Metadata } from "next";

import { PreferencesWorkspace } from "@/components/workspace/PreferencesWorkspace";

export const metadata: Metadata = {
  title: "Preferences",
};

export default function PreferencesPage() {
  return <PreferencesWorkspace />;
}
