import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In development Next blocks requests to its dev assets from any origin other than
  // localhost. Opening the app at http://127.0.0.1:3000 (which the API's CORS/CSRF
  // settings allow) would otherwise leave the page un-hydrated: no client-side
  // rendering at all, so the navbar never gets its Sign in / Sign up links.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
