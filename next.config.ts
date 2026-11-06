import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor/Vercel project settings still expect Output Directory `dist`
  // (leftover from the Vite Phase 1 publish). Keep Node APIs + Postgres;
  // do not use static `output: 'export'`.
  distDir: "dist",
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
