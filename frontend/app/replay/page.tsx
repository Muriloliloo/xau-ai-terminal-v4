import type { Metadata } from "next";

import { MarketReplayWorkspace } from "@/components/replay/MarketReplayWorkspace";

export const metadata: Metadata = {
  title: "Market Replay",
};

export default function MarketReplayPage() {
  return <MarketReplayWorkspace />;
}
