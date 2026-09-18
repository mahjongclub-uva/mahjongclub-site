"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

/**
 * The only client component on the site, so the current tab can mark itself
 * from the route. The alternative (threading a `current` prop from every
 * page) keeps things fully server-rendered but silently forgets a new page's
 * active state; this is the more usual Next pattern and costs very little.
 *
 * If you add a page, add it here.
 */
const TABS = [
  { href: "/", label: "Home" },
  { href: "/about/", label: "About" },
  { href: "/guide/", label: "Guide" },
  { href: "/leaderboard/", label: "Leaderboard" },
];

export default function Nav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // Marker position in pixels; null until measured, also what a
  // no-JS visitor is left with — see .nav[data-marker="on"] in CSS.
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(
    null,
  );

  const measure = useCallback(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !tab) {
      setMarker(null);
      return;
    }
    const listBox = list.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    setMarker({ left: tabBox.left - listBox.left, width: tabBox.width });
  }, []);

  // Layout effect, not effect: measure and paint in the same frame, or the
  // marker is visibly wrong for one frame on load.
  useLayoutEffect(() => {
    measure();
    // The tabs are fluid, so their widths change with the viewport and with
    // late-arriving fonts. Both would leave the marker stranded.
    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [measure, pathname]);

  return (
    <nav
      className="nav"
      aria-label="Main"
      data-marker={marker ? "on" : undefined}
    >
      <div className="nav-inner">
        <Logo />
        <ul ref={listRef}>
          {/* Purely decorative (aria-current on the link handles a11y). No
              guard needed against animating on first paint: it's inserted
              already at its final transform, and only slides on later
              changes since a transition needs a prior value to interpolate from. */}
          {marker && (
            <li className="nav-marker" aria-hidden="true">
              <span
                style={{
                  transform: `translateX(${marker.left}px)`,
                  width: `${marker.width}px`,
                }}
              />
            </li>
          )}
          {TABS.map((tab) => {
            // basePath is stripped from usePathname, so these compare cleanly.
            const current =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href.replace(/\/$/, ""));
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  // Tells a screen reader which tab you are on. Not conveyed
                  // by colour alone.
                  aria-current={current ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
