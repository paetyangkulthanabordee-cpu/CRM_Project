import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
      {
        source: "/pipeline-stages/:path*",
        destination: "http://localhost:3001/api/pipeline-stages/:path*",
      },
    ];
  },
};

export default nextConfig;
