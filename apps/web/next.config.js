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

module.exports = nextConfig;
