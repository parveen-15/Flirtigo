import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    // BACKEND_URL is server-side only (not in JS bundle).
    // Local: http://localhost:3001  |  Vercel: set BACKEND_URL in dashboard.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      { source: '/proxy/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

export default nextConfig;
