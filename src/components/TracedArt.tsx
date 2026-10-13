/**
 * A face traced from photos of the club's own set (pipeline/trace_tiles.py):
 * the bird, the flowers and the seasons. Each lives in its own static file the
 * browser caches, so no path data sits in a page's HTML and a page fetches
 * only the faces it shows.
 */
export function Traced({ face }: { face: string }) {
  return (
    <use href={`/tiles/traced/${face}.svg#${face}`} width="88" height="124" />
  );
}
