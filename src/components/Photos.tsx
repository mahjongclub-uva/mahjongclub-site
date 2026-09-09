import type { CSSProperties } from "react";
import { PHOTOS } from "@/lib/site";
import { asset } from "@/lib/asset";

/**
 * Club photographs.
 *
 * Add them in src/lib/site.ts. Until there are any, this renders nothing so
 * visitors never see a row of unfinished placeholder frames.
 *
 * Each frame carries --i, which offsets its scroll-reveal so they arrive one
 * after another rather than all at once.
 *
 * Every image declares width and height, so nothing on the page moves as they
 * load. Read the privacy rules in CLAUDE.md before adding a photograph of
 * anybody — no full names, no precise location, and strip EXIF first.
 */
export default function Photos() {
  if (PHOTOS.length === 0) return null;

  return (
    <div className="photo-grid">
      {PHOTOS.map((photo, i) => (
        <figure
          className="photo-slot"
          key={photo.src}
          style={{ "--i": i } as CSSProperties}
        >
          {/* asset() prefixes the base path; a bare src would 404 in
              production. next/image would add nothing here — optimisation is
              off, since a static export has no image server — and it does not
              prefix the path either once unoptimized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(photo.src)}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
          />
        </figure>
      ))}
    </div>
  );
}
