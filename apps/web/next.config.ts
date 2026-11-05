import type { NextConfig } from 'next';

/**
 * WATTWISE_STATIC=1 builds an offline static bundle (no server routes) used by
 * the Android (Capacitor) and Windows (Electron) test builds. In that mode the
 * app runs in local mode: AI bill reading is unavailable, manual entry works.
 */
const isStatic = process.env.WATTWISE_STATIC === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@wattwise/core'],
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        distDir: 'out', // Next 16 writes the export into distDir
        // Types are checked by the regular build and `npm run typecheck`; skipping here avoids
        // stale route types from the parked API folder.
        typescript: { ignoreBuildErrors: true },
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
