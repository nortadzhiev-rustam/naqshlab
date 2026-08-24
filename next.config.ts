import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Next 16 blocks optimising upstreams that resolve to a private IP.
    // The local backend (naqshlab.test) resolves to 127.0.0.1, so every
    // product image 400s without this. remotePatterns below still limits
    // which hosts may be fetched at all.
    dangerouslyAllowLocalIP: true,
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
