"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** A layer over the page. A native dialog, so focus moves in and comes back. */
export default function Sheet({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    // React removes the dialog before this cleanup runs, so the browser
    // cannot return focus itself; hand it back to what opened the sheet.
    const opener = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="meeting-calculator table-sheet"
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
