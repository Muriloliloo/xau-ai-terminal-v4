import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Dashboard } from "@/components/institutional/Dashboard";

export const metadata: Metadata = {
  title: "Snapshot institucional",
};

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshotId = Number(id);
  if (!Number.isInteger(snapshotId) || snapshotId <= 0) notFound();
  return <Dashboard snapshotId={snapshotId} />;
}
