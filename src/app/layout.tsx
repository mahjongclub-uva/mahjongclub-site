import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahjong Club at UVA",
  description:
    "Fuzhou-style 16-tile mahjong at the University of Virginia. Beginners welcome.",
};

// No font is loaded yet. When the display face for the wordmark is chosen,
// bring it in with next/font/local so it is self-hosted and subset rather than
// fetched from a third party. Body text can stay on the system stack.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
