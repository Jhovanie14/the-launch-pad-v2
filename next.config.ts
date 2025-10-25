import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "knbixjluxzodnisuhkii.supabase.co", // 👈 your Supabase project URL
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
