import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Cloudflare R2 public bucket URL (pub-*.r2.dev or custom domain)
      // Replace this hostname with your actual R2_PUBLIC_URL domain
      {
        protocol: "https",
        hostname: "pub-192fc0d23a4e4b16b5fcabd2cca9a26a.r2.dev",
      },
    ],
  },
};

export default nextConfig;
