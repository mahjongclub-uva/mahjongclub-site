"use client";

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
  { href: "/leaderboard/", label: "Leaderboard" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <Logo />
        <ul>
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
                // Tells a screen reader which tab you are on. Not conveyed by
                // the underline alone.
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
