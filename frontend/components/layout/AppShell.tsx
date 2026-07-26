"use client";

import type { ReactNode } from "react";

import { AcademyDrawer } from "@/components/academy/AcademyDrawer";
import { AcademyProvider } from "@/components/academy/AcademyProvider";
import { WelcomeTour } from "@/components/academy/WelcomeTour";
import { GlobalToolbar } from "@/components/layout/GlobalToolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/WorkspaceProvider";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <WorkspaceProvider>
      <AcademyProvider>
        <WorkspaceFrame>{children}</WorkspaceFrame>
        <AcademyDrawer />
        <WelcomeTour />
      </AcademyProvider>
    </WorkspaceProvider>
  );
}

function WorkspaceFrame({ children }: Readonly<{ children: ReactNode }>) {
  const { isFullscreen, preferences } = useWorkspace();
  const workspaceMode = preferences.compactMode
    ? "compact"
    : preferences.workspaceMode;
  const contentWidth = isFullscreen
    ? "max-w-none"
    : {
        compact: "max-w-[1760px]",
        normal: "max-w-[1600px]",
        expanded: "max-w-[1920px]",
      }[workspaceMode];

  return (
    <div
      data-workspace-mode={workspaceMode}
      data-fullscreen={isFullscreen ? "true" : "false"}
      className="min-h-screen bg-terminal-bg text-terminal-text"
    >
      {isFullscreen ? null : <Sidebar />}
      <main
        className={`min-w-0 overflow-x-clip px-3 pb-8 pt-4 transition-[margin,padding] duration-200 sm:px-5 lg:px-6 lg:py-4 ${
          isFullscreen ? "lg:ml-0" : "lg:ml-60"
        }`}
      >
        <div className={`mx-auto w-full ${contentWidth}`}>
          <GlobalToolbar />
          {children}
        </div>
      </main>
    </div>
  );
}
