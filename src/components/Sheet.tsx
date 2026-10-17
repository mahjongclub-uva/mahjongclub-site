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
  // The swipe handlers are set up once; this keeps them on the latest close.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
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
    // Swipe down to dismiss, from the top of the sheet's scroll. Touch
    // events, not pointer events: iOS cancels a pointer once it starts its
    // own overscroll, and only a non-passive touchmove can stop that.
    let startY = 0;
    let lastY = 0;
    let lastAt = 0;
    let speed = 0;
    let dragging = false;
    const start = (event: TouchEvent) => {
      startY = lastY = event.touches[0].clientY;
      lastAt = event.timeStamp;
      dragging = false;
    };
    const move = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      // 10px of give first, so taps and scrolls stay taps and scrolls.
      if (!dragging) {
        if (y - startY < 10 || element.scrollTop > 0) return;
        dragging = true;
        element.style.transition = "none";
      }
      event.preventDefault();
      speed = (y - lastY) / Math.max(1, event.timeStamp - lastAt);
      lastY = y;
      lastAt = event.timeStamp;
      element.style.translate = `0 ${Math.max(0, y - startY - 10)}px`;
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      // Far enough, or flicked: close. Otherwise settle back.
      if (lastY - startY > element.offsetHeight / 3 || speed > 0.5) {
        closeRef.current();
        return;
      }
      element.style.transition = matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? ""
        : "translate 220ms cubic-bezier(0.32, 0.72, 0, 1)";
      element.style.translate = "";
    };
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
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
      onClick={(event) => {
        // A tap on the dimmed page lands on the dialog itself, outside its box.
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientY < box.top ||
          event.clientY > box.bottom ||
          event.clientX < box.left ||
          event.clientX > box.right
        )
          close();
      }}
    >
      {/* The handle says the sheet can be pulled down. */}
      <span className="sheet-grabber" aria-hidden="true" />
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
