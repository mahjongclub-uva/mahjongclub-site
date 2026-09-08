/**
 * The one-of-circles tile, drawn flat.
 *
 * It is the quietest mark in the set — concentric rings, nothing else — which
 * makes it the right accent for a page built on negative space. Rendered as
 * flat fills rather than outlines, with the rings very slightly off-centre, so
 * it reads as something printed rather than something plotted.
 *
 * Decorative. Hidden from assistive technology, and it never carries meaning
 * on its own.
 */
export default function Dots({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="42" fill="var(--dots-outer)" />
      <circle cx="50.6" cy="49.4" r="31" fill="var(--dots-inner)" />
      <circle cx="50" cy="50" r="19" fill="var(--dots-outer)" />
      <circle cx="49.6" cy="50.4" r="8" fill="var(--dots-core)" />
    </svg>
  );
}
