import { PHOTOS, type Photo } from "@/lib/site";
import { asset } from "@/lib/asset";

/** Inline club photographs, with descriptive alt text and no viewer controls. */
export default function Photos({ photos = PHOTOS }: { photos?: Photo[] }) {
  if (!photos.length) return null;
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <figure className="photo-slot" key={photo.src}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(photo.src)}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: photo.position }}
          />
        </figure>
      ))}
    </div>
  );
}
