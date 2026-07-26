import type { Metadata } from "next";

import { SettingsWorkspace } from "@/components/layout/SettingsWorkspace";

export const metadata: Metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
