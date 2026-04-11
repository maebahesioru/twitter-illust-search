import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rts-pctr.c.yimg.jp" },
    ],
  },
};

export default nextConfig;
