import { IconArrowUp } from "@tabler/icons-react";

/** Floats at the bottom of a long page and jumps back to its very top, site navigation included. */
export default function BackToTop() {
  return (
    <div className="back-to-top">
      <a className="action-link" href="#top">
        <IconArrowUp size={18} aria-hidden="true" /> Back to top
      </a>
    </div>
  );
}
