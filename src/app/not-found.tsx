import Link from "next/link";
import type { CSSProperties } from "react";
import { TileFace } from "@/components/PlayingTile";
import { RED } from "@/components/TileArtwork";

export const metadata = {
  title: "Page not found - Mahjong Club @ UVA",
};

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="section-wrap">
        <h1 className="not-found-tiles" aria-label="404: page not found">
          {["4", "0", "4"].map((digit, i) => (
            <span
              className="not-found-tile"
              key={i}
              style={{ "--i": i } as CSSProperties}
              aria-hidden="true"
            >
              <TileFace>
                <text
                  x="44"
                  y="84"
                  textAnchor="middle"
                  fontFamily="var(--body), sans-serif"
                  fontWeight="700"
                  fontSize="64"
                  fill={RED}
                >
                  {digit}
                </text>
              </TileFace>
            </span>
          ))}
        </h1>
        <p className="not-found-title">This tile isn’t in the set.</p>
        <p className="page-intro">
          The page you’re looking for doesn’t exist, or it moved.
        </p>
        <p className="not-found-actions">
          <Link className="action-link action-link-primary" href="/">
            Back to the table
          </Link>
          <Link className="action-link" href="/guide/">
            Learn the tiles
          </Link>
        </p>
      </div>
    </main>
  );
}
