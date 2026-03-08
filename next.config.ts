import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize native modules that can't be bundled
  serverExternalPackages: ['chokidar'],
  basePath: '/aiox-dashboard',
  // Prevent stale HTML after rebuilds — HTML pages must revalidate,
  // while hashed _next/static assets remain immutable (default behavior)
  headers: async () => [
    {
      source: '/((?!_next/static).*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
  ],
};

export default nextConfig;
