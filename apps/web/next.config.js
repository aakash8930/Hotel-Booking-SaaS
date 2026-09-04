/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker/Serverless deploys
  output: 'standalone',

  images: {
    remotePatterns: [
      // Cloudflare R2 for room photos
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      // Also allow custom R2 public domains
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },

  // Proxy API calls in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },

  // Allow preview environments
  allowedDevOrigins: ['*.e2b.app'],
};

const { withSentryConfig } = require('@sentry/nextjs');

// Wrapping is safe with no Sentry env vars set at all: withSentryConfig
// just skips source-map upload (org/project/authToken all optional here)
// and leaves the build untouched. Runtime error capture itself is wired
// in instrumentation.ts / instrumentation-client.ts, independent of this.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
