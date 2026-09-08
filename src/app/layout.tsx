import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { FULL_NAME, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: FULL_NAME,
  description: `Fuzhou-style 16-tile mahjong at the University of Virginia. ${TAGLINE}`,
};

// No web font is loaded. The display face is a serif stack that resolves to
// something book-like on every platform — Iowan Old Style on Apple devices,
// Palatino or Georgia elsewhere — which costs zero requests and cannot cause
// a flash of unstyled text. Revisit only if the wordmark needs a specific face.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
