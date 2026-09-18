/**
 * Prefixes a public/ path with the site's base path (e.g. "/logo.png" ->
 * "/mahjongclub-site/logo.png"). Needed because the site is served from a
 * subpath and Next doesn't apply that prefix to image src automatically.
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}
