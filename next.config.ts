import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error: eslint option removed from NextConfig types but still works at runtime
  eslint: { ignoreDuringBuilds: true },
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
