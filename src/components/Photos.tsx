import { PHOTOS } from "@/lib/site";

/**
 * Club photographs.
 *
 * Add them in src/lib/site.ts. Until there are any, this renders empty frames
 * at the right proportions — so the layout is real and you can see how many
 * pictures the page wants before anyone has taken them.
 *
 * Every image declares width and height, so nothing on the page moves as they
 * load. Read the privacy rules in CLAUDE.md before adding a photograph of
 * anybody.
 */
export default function Photos() {
  if (PHOTOS.length === 0) {
    return (
      <div className="photo-grid">
        {[0, 1, 2].map((i) => (
          <div className="photo-slot is-empty" key={i} role="presentation">
            <span>Photograph</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {PHOTOS.map((photo) => (
        <figure className="photo-slot" key={photo.src}>
          {/* Plain <img> on purpose. The lint rule assumes next/image will
              optimize, but this is a static export with images.unoptimized —
              there is no image server, so next/image would add a concept and
              change nothing. Width, height, and lazy loading are set by hand
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
