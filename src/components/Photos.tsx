import type { ImgHTMLAttributes } from "react";
import { PHOTOS, type Photo } from "@/lib/site";

// The smaller copies scripts/photos.mjs writes next to each photo.
const SMALLER_WIDTHS = [800, 1200];

/** A club photograph, offering the browser a copy near the size it shows. */
export function ClubPhoto({
  photo,
  ...rest
}: { photo: Photo } & ImgHTMLAttributes<HTMLImageElement>) {
  const stem = photo.src.replace(/\.webp$/, "");
  const srcSet = [
    ...SMALLER_WIDTHS.filter((w) => w < photo.width).map(
      (w) => `${stem}-${w}.webp ${w}w`,
    ),
    `${photo.src} ${photo.width}w`,
  ].join(", ");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      srcSet={srcSet}
      // Photos never show wider than about 670px; see the photo columns.
      sizes="(max-width: 1023px) 90vw, 34rem"
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
}

/** Inline club photographs, with descriptive alt text and no viewer controls. */
export default function Photos({ photos = PHOTOS }: { photos?: Photo[] }) {
  if (!photos.length) return null;
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <figure className="photo-slot" key={photo.src}>
          <ClubPhoto photo={photo} style={{ objectPosition: photo.position }} />
        </figure>
      ))}
    </div>
  );
}
