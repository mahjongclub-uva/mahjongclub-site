/**
 * Prefixes a file in public/ with the site's base path.
 *
 * The site is served from a subpath, and a bare "/logo.png" resolves to the
 * domain root — which works in development and 404s in production. Next
 * handles this for routes and next/link, but not for an image's src. So any
 * path pointing at public/ goes through here.
 *
 *   asset("/logo.png")  ->  "/mahjongclub-site/logo.png"
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}
