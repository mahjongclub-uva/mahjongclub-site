/**
 * The link-preview card shown when the site is pasted into a chat: the
 * header's MAHJONG tiles in their grey face, the club name and the tagline.
 * Drawn once at build time, like /story.png. A route rather than the
 * opengraph-image convention, which exports without a .png extension, and
 * GitHub Pages would serve that as a download rather than an image.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { CLUB_NAME, TAGLINE, WORDMARK } from "@/lib/site";

export const dynamic = "force-static";

const font = (file: string) =>
  readFile(path.join(process.cwd(), "node_modules/@fontsource", file));

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f1e8",
        color: "#292722",
        fontFamily: "Public Sans",
      }}
    >
      <div style={{ display: "flex", gap: 18 }}>
        {WORDMARK.split("").map((letter, i) => (
          // The tile's body, grey into jade, showing below the face.
          <div
            key={i}
            style={{
              display: "flex",
              width: 128,
              height: 186,
              borderRadius: 16,
              background: "linear-gradient(to bottom, #d0cec7 65%, #3f8871)",
              boxShadow: "0 8px 14px rgba(35, 40, 31, 0.16)",
            }}
          >
            <div
              style={{
                width: 128,
                height: 172,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                background: "linear-gradient(to bottom, #ecebe8, #e4e3df)",
                boxShadow:
                  "inset 0 -3px 0 #d3d1ca, inset 0 2px 0 rgba(255, 255, 255, 0.7)",
                color: "#9d302b",
                fontSize: 72,
                fontWeight: 700,
              }}
            >
              {letter}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 52,
          fontSize: 40,
          letterSpacing: 9,
          textTransform: "uppercase",
        }}
      >
        {CLUB_NAME}
      </div>
      <div style={{ marginTop: 18, fontSize: 30, color: "#605b52" }}>
        {TAGLINE}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Public Sans",
          data: await font(
            "public-sans/files/public-sans-latin-400-normal.woff",
          ),
          weight: 400,
        },
        {
          name: "Public Sans",
          data: await font(
            "public-sans/files/public-sans-latin-700-normal.woff",
          ),
          weight: 700,
        },
      ],
    },
  );
}
