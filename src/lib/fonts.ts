import { Nunito } from "next/font/google";

// The meeting pages' own rounded face, so the game feels apart from the site.
// Also used by the live pill and home card, which the root layout renders on
// every page; not preloaded, since most visits never show them.
export const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-meeting",
  display: "swap",
  preload: false,
});
