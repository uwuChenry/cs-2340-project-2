import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls so browser requests stay same-origin during local development.
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
  },
};

export default nextConfig;
