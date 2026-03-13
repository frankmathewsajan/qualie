import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/demo",
        destination: "/listen",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
