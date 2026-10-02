"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isMeetingPage } from "@/lib/meeting";

export default function SiteChrome({
  children,
  navigation,
  footer,
}: {
  children: ReactNode;
  navigation: ReactNode;
  footer: ReactNode;
}) {
  const meeting = isMeetingPage(usePathname());
  return (
    <>
      {!meeting && navigation}
      {children}
      {!meeting && footer}
    </>
  );
}
