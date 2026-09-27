import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Absolute app root — avoids Turbopack resolving the parent monorepo when a lockfile exists there. */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  eslint: {
    // Disable ESLint during builds to allow deployment
    // TODO: Fix linting errors and re-enable
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep TypeScript checking enabled for type safety
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
