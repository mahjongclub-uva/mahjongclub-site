import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
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
