"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** A layer over the page. A native dialog, so focus moves in and comes back. */
export default function Sheet({
  title,
  close,
  className,
  children,
}: {
  title: string;
  close: () => void;
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    // React removes the dialog before this cleanup runs, so the browser
    // cannot return focus itself; hand it back to what opened the sheet.
    const opener = document.activeElement as HTMLElement | null;
    // Keep the page fixed behind the modal, including on mobile Safari.
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    element.showModal();
    return () => {
      element.close();
      Object.assign(body.style, previous);
      window.scrollTo({ top: scrollY, behavior: "instant" });
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`meeting-calculator table-sheet ${className ?? ""}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="calculator-head">
        <h2 id={id}>{title}</h2>
        <button
          className="meeting-text"
          type="button"
          onClick={close}
          aria-label={`Close ${title}`}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
