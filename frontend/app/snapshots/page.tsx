import type { Metadata } from "next";

import { SnapshotsWorkspace } from "@/components/snapshots/SnapshotsWorkspace";

export const metadata: Metadata = {
  title: "Snapshots",
};

export default function SnapshotsPage() {
  return <SnapshotsWorkspace />;
}
