import Photos from "@/components/Photos";
import { HOME, PHOTOS } from "@/lib/site";

/** The first two approved photos occupy the welcome section. */
export default function ClubPhotos() {
  return (
    <div className="club-photos">
      {PHOTOS.length ? (
        <Photos photos={PHOTOS.slice(0, 2)} />
      ) : (
        <div className="club-photo-placeholder">
          <span className="photo-corner photo-corner-top" aria-hidden="true" />
          <p>{HOME.photosPending}</p>
          <span
            className="photo-corner photo-corner-bottom"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
