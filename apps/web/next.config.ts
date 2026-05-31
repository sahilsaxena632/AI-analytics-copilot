import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL must be set for production builds");
}

const nextConfig: NextConfig = {
  transpilePackages: ["@analytics-copilot/shared"],
  async redirects() {
    return [
      { source: "/ask", destination: "/app/ask", permanent: true },
      { source: "/schema", destination: "/app/schema", permanent: true },
      { source: "/history", destination: "/app/history", permanent: true },
      { source: "/dashboards", destination: "/app/dashboards", permanent: true },
      { source: "/dashboards/:id", destination: "/app/dashboards/:id", permanent: true },
      { source: "/connect-database", destination: "/onboarding/connect-database", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
