import type { Metadata } from "next";

import { FavoritesWorkspace } from "@/components/workspace/FavoritesWorkspace";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return <FavoritesWorkspace />;
}
