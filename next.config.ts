import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves files off disk. There is no Node server at runtime, so
  // API routes, middleware, server actions and ISR are all unavailable. Any of
  // them will fail the build rather than fail silently in production.
  output: "export",

  // next/image normally calls a server to resize images on demand. Under
  // `output: "export"` that server does not exist, so images are served as
  // authored. Give every <Image> an explicit width and height.
  images: { unoptimized: true },

  // Emit leaderboard/index.html instead of leaderboard.html, so the URL
  // /leaderboard/ resolves on a plain static file server with no rewrite rules.
  trailingSlash: true,
};

export default nextConfig;
