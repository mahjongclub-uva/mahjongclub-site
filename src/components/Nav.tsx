"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

/**
 * The only client component on the site.
 *
 * It exists so the current tab can mark itself, which needs to know the route.
 * The alternative — threading a `current` prop from every page — keeps the
 * site fully server-rendered but means a new page silently gets no active
 * state until somebody remembers. This is the more usual Next pattern and the
 * one a maintainer is likelier to have seen, and it costs very little.
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

  // Where the marker sits, in pixels within the list. Null until measured,
  // which is also what a visitor without JavaScript is left with — see the
  // CSS note on .nav[data-marker="on"].
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
          {/* Purely decorative: the current tab is announced by aria-current,
              which is on the link itself and does not depend on any of this.

              No guard against animating on first paint, because there is
              nothing to guard against: a transition needs a previous computed
              value to interpolate from, and this element is inserted already
              carrying its final transform. It slides only on the later
              changes, which is exactly when it should. */}
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
