/**
 * A section divider shaped like a scoring stick: a hairline with a short
 * marked segment at its centre, the way the sticks carry pips.
 *
 * Decorative, so it is hidden from assistive technology — the heading that
 * follows it is what actually separates the sections.
 */
export default function Rule() {
  return <div className="rule" role="presentation" aria-hidden="true" />;
}
