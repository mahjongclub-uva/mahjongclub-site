import type { Metadata } from "next";
import { Barlow_Condensed, Noto_Sans_SC, Public_Sans } from "next/font/google";
import AmbientTiles from "@/components/AmbientTiles";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { TileArtDefs } from "@/components/TileArt";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Carries the ten characters on the rank tiles, 一 through 九 and 萬.
 *
 * A sans rather than a serif on purpose. 一, 二 and 三 are nothing but
 * horizontal strokes, and a serif tapers them to hairlines that all but vanish
 * at tile size. A gothic keeps the stroke even, so the low numerals carry the
 * same weight as 四 through 九.
 */
const han = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-han",
  display: "swap",
  // Not preloaded on purpose. Preloading would fetch this face's latin subset,
  // which nothing on the site renders — the ten characters we do use live in
  // CJK unicode ranges that the browser fetches only when it meets them.
  preload: false,
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${han.variable}`}
    >
      <body>
        {/*
          No JavaScript means no canvas is coming and no fallback timer will
          ever fire, so reveal the flat wordmark. Without this the header is
          permanently blank, which is the one outcome that is not acceptable.
        */}
        <noscript>
          <style>{`.wordmark-tiles { opacity: 1 !important; }`}</style>
        </noscript>

        {/* Tile gradients, declared once for every tile on every page. */}
        <TileArtDefs />
        <AmbientTiles />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
