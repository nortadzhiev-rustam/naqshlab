import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io", // Uploadthing CDN
      },
      {
        protocol: "https",
        hostname: "**.ufs.sh", // Uploadthing CDN (alternate)
      },
    ],
  },
};

export default nextConfig;
