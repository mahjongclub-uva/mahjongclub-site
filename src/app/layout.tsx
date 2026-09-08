import type { Metadata } from "next";
import { Cormorant_Garamond, Lora, Noto_Serif_SC } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { TileArtDefs } from "@/components/TileArt";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Carries the ten characters on the rank tiles, 一 through 九 and 萬.
 *
 * A real bold weight rather than leaning on the system CJK font: those vary by
 * platform and synthesise bold badly, which on a 42px tile is the difference
 * between a crisp glyph and a smudge.
 */
const han = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-han",
  display: "swap",
  // Not preloaded on purpose. Preloading would fetch this face's latin subset,
  // which nothing on the site renders — the ten characters we do use live in
  // CJK unicode ranges that the browser fetches only when it meets them.
  preload: false,
});

const body = Lora({
  subsets: ["latin"],
  weight: ["400", "600"],
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
    <html lang="en" className={`${display.variable} ${body.variable} ${han.variable}`}>
      <body>
        {/*
          The flat wordmark ships hidden so nothing flashes before the canvas
          takes over. With JavaScript off there is no canvas coming, so reveal
          it — this is the only thing standing between a no-JS visitor and a
          nameless page.
        */}
        <noscript>
          <style>{`.wordmark-tiles { opacity: 1 !important; }`}</style>
        </noscript>

        {/* Tile gradients, declared once for every tile on every page. */}
        <TileArtDefs />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
