import { IconArrowUp } from "@tabler/icons-react";

/** Floats at the bottom of a long page and jumps back to its top. */
export default function BackToTop({ target }: { target: string }) {
  return (
    <div className="back-to-top">
      <a className="action-link" href={`#${target}`}>
        <IconArrowUp size={18} aria-hidden="true" /> Back to top
      </a>
    </div>
  );
}
