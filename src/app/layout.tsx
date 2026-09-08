import type { Metadata } from "next";
import { Instrument_Serif, Spectral } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { TileArtDefs } from "@/components/TileArt";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = Spectral({
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
        {/* Tile gradients, declared once for every tile on every page. */}
        <TileArtDefs />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
