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
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "naqshlab.test",
      },
      {
        protocol: "https",
        hostname: "naqshlab.test",
      },
    ],
  },
};

export default nextConfig;
