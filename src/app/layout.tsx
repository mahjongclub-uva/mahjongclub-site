import type { Metadata } from "next";
import { Fraunces, EB_Garamond } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

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
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
