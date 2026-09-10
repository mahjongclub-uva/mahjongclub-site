"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PHOTOS, type Photo } from "@/lib/site";
import { asset } from "@/lib/asset";

/** Add consented, EXIF-stripped photographs to PHOTOS in site.ts. */
export default function Photos({ photos = PHOTOS }: { photos?: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  if (!photos.length) return null;
  const photo = photos[active];
  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <motion.figure
            className="photo-slot"
            key={photo.src}
            initial={false}
            whileInView={reduce ? undefined : { y: [18, 0], opacity: [0.5, 1] }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
          >
            <button
              type="button"
              onClick={() => {
                setActive(i);
                dialog.current?.showModal();
              }}
              aria-label={`Enlarge photo: ${photo.alt}`}
            >
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
              <span className="photo-open" aria-hidden="true">
                View photo ↗
              </span>
            </button>
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </motion.figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-label="Club photo viewer"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight")
            setActive((n) => (n + 1) % photos.length);
          if (event.key === "ArrowLeft")
            setActive((n) => (n - 1 + photos.length) % photos.length);
        }}
      >
        <div className="photo-dialog-inner">
          <form method="dialog">
            <button className="action-link" autoFocus>
              Close ×
            </button>
          </form>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(photo.src)}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
          />
          <div className="photo-navigation">
            <button
              type="button"
              onClick={() =>
                setActive((n) => (n - 1 + photos.length) % photos.length)
              }
              disabled={photos.length < 2}
            >
              Previous
            </button>
            <p aria-live="polite">
              {active + 1} / {photos.length}
              {photo.caption ? ` · ${photo.caption}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setActive((n) => (n + 1) % photos.length)}
              disabled={photos.length < 2}
            >
              Next
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
