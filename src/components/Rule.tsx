/**
 * A section divider: a short run of face-down tiles, like a piece of the wall
 * left on the table.
 *
 * It does the job a dinkus does in a printed book — a small mark in a lot of
 * white space that says "a break happens here" without drawing a line across
 * the page. Seven tiles, the same count as the wordmark.
 *
 * Decorative, so it is hidden from assistive technology. The heading that
 * follows is what actually separates the sections for a screen reader.
 */
export default function Rule({ tiles = 7 }: { tiles?: number }) {
  return (
    <div className="rule" role="presentation" aria-hidden="true">
      {Array.from({ length: tiles }, (_, i) => (
        <span className="rule-tile" key={i} />
      ))}
    </div>
  );
}
