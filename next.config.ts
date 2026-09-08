import type { NextConfig } from "next";

// The site is published to GitHub Pages at
//   https://mahjongclub-uva.github.io/mahjongclub-site/
// so every route and every asset lives under /mahjongclub-site.
//
// If the repo is ever renamed, or moved into a repo literally named
// "mahjongclub-uva.github.io", this is the one line to change. Setting it to ""
// serves the site from the domain root.
const BASE_PATH = "/mahjongclub-site";

const nextConfig: NextConfig = {
  // GitHub Pages serves files off disk. There is no Node server at runtime, so
  // API routes, middleware, server actions and ISR are all unavailable. Any of
  // them will fail the build rather than fail silently in production.
  output: "export",

  basePath: BASE_PATH,

  // next/image normally calls a server to resize images on demand. Under
  // `output: "export"` that server does not exist, so images are served as
  // authored. Give every <Image> an explicit width and height.
  images: { unoptimized: true },

  // Emit leaderboard/index.html instead of leaderboard.html, so the URL
  // /leaderboard/ resolves on a plain static file server with no rewrite rules.
  trailingSlash: true,

  // Exposed so components can prefix their own asset paths. Next prefixes
  // basePath for routes and for next/link, but NOT for an <img src> or a CSS
  // url() — and not for next/image either once images are unoptimized. Any
  // file referenced from public/ has to be prefixed by hand, via asset().
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
};

export default nextConfig;
