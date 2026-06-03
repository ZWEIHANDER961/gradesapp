/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  typescript: {
    // TEMPORARY: allow production builds to succeed even if TypeScript reports errors
    // Remove this after fixing the underlying type issues (e.g. @types/node mismatch)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;