import type { Metadata } from "next";
import { Fraunces, EB_Garamond } from "next/font/google";
import Footer from "@/components/Footer";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

/**
 * Two open-licensed faces, downloaded at build time and served from our own
 * origin by next/font. No cost, no request to Google when someone visits, and
 * no third party learning who reads this page.
 *
 * Fraunces carries the wordmark and headings. It is a contemporary book serif
 * with actual character — high contrast, slightly wonky terminals — which is
 * what stops the page reading as a default.
 *
 * EB Garamond sets the prose. Classical, quiet, and unmistakably a book face,
 * so it sits under Fraunces without competing with it.
 *
 * To try something else, change the imports here and nothing else: the rest of
 * the site reads --font-display and --font-body.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: FULL_NAME,
  description: `Fuzhou-style 16-tile mahjong at the University of Virginia. ${TAGLINE}`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
