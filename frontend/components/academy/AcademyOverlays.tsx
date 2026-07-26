"use client";

import dynamic from "next/dynamic";

import { useAcademy } from "@/components/academy/AcademyProvider";

const AcademyDrawer = dynamic(() =>
  import("@/components/academy/AcademyDrawer").then(
    (module) => module.AcademyDrawer,
  ),
);
const WelcomeTour = dynamic(() =>
  import("@/components/academy/WelcomeTour").then(
    (module) => module.WelcomeTour,
  ),
);

export function AcademyOverlays() {
  const { activeLessonId, isTourOpen } = useAcademy();

  return (
    <>
      {activeLessonId ? <AcademyDrawer /> : null}
      {isTourOpen ? <WelcomeTour /> : null}
    </>
  );
}
