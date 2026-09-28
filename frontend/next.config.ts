import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In development Next blocks requests to its dev assets from any origin other than
  // localhost. Opening the app at http://127.0.0.1:3000 (which the API's CORS/CSRF
  // settings allow) would otherwise leave the page un-hydrated: no client-side
  // rendering at all, so the navbar never gets its Sign in / Sign up links.
  allowedDevOrigins: ["127.0.0.1"],

  // In production the browser calls the API through this app's own domain and Next
  // forwards it to Django (API_URL). The session cookie then stays first-party;
  // calling the backend's domain directly would make it a third-party cookie, which
  // Safari and Chrome's tracking protection drop. Unset in local dev, where the
  // browser talks to :8000 directly.
  //
  // Django's URLs all end in "/", but Next redirects "/api/jobs/" to "/api/jobs" by
  // default, and Django then redirects back: a loop, and POSTs fail outright. So the
  // automatic redirect is off, and the slashed rule comes first so the slash is kept
  // when forwarding.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const backend = process.env.API_URL?.replace(/\/$/, "");
    if (!backend) return [];
    return [
      { source: "/api/:path*/", destination: `${backend}/api/:path*/` },
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
};

export default nextConfig;
