import type { CSSProperties } from "react";
import { PHOTOS } from "@/lib/site";

/**
 * Club photographs.
 *
 * Add them in src/lib/site.ts. Until there are any, this renders empty frames
 * at the right proportions, so the layout is real before anyone has taken a
 * picture.
 *
 * Each frame carries --i, which offsets its scroll-reveal so they arrive one
 * after another rather than all at once.
 *
 * Every image declares width and height, so nothing on the page moves as they
 * load. Read the privacy rules in CLAUDE.md before adding a photograph of
 * anybody — no full names, no precise location, and strip EXIF first.
 */
export default function Photos() {
  if (PHOTOS.length === 0) {
    return (
      <div className="photo-grid">
        {[0, 1, 2].map((i) => (
          <div
            className="photo-slot is-empty"
            key={i}
            style={{ "--i": i } as CSSProperties}
            role="presentation"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {PHOTOS.map((photo, i) => (
        <figure
          className="photo-slot"
          key={photo.src}
          style={{ "--i": i } as CSSProperties}
        >
          {/* Plain <img> on purpose. The lint rule assumes next/image will
              optimize, but this is a static export with images.unoptimized —
              there is no image server, so next/image would add a concept and
              change nothing. Width, height and lazy loading are set by hand
              below, which is what the rule is actually protecting. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
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
