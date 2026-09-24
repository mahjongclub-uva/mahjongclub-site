import { asset } from "@/lib/asset";

/**
 * A face traced from photos of the club's own set (pipeline/trace_tiles.py):
 * the bird, the flowers and the seasons. They live in one static sprite the
 * browser caches, so none of that path data sits in a page's HTML.
 */
export function Traced({ face }: { face: string }) {
  return (
    <use href={asset(`/tiles/traced.svg#${face}`)} width="88" height="124" />
  );
}
