import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/documents",
        destination: "/customers",
        permanent: false,
      },
      {
        source: "/product-types",
        destination: "/product-groups",
        permanent: false,
      },
    ];
  },
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
      {
        source: "/customers/:path*",
        destination: "http://localhost:3001/api/customers/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://localhost:3001/api/users/:path*",
      },
      {
        source: "/products/:path*",
        destination: "http://localhost:3001/api/products/:path*",
      },
      {
        source: "/permissions/:path*",
        destination: "http://localhost:3001/api/permissions/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
