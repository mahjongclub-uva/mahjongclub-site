"use client";

import { useEffect } from "react";
import { halloweenWeek } from "@/lib/season";

/** Marks the page with the season on this phone's own date, since the site
 * is built ahead of time; halloween.css keys off it. */
export default function SeasonMark() {
  useEffect(() => {
    if (halloweenWeek(new Date()))
      document.documentElement.dataset.season = "halloween";
  }, []);
  return null;
}
