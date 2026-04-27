import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tracmer-app/database"],
  async redirects() {
    return [
      { source: "/sign-in", destination: "/login", permanent: false },
      { source: "/sign-in/:path*", destination: "/login", permanent: false },
      { source: "/sign-up", destination: "/registro", permanent: false },
      { source: "/sign-up/:path*", destination: "/registro", permanent: false },
    ];
  },
  async rewrites() {
    // Los navegadores piden /favicon.ico aunque metadata.icons use otro path; el ícono real es el SVG de marca.
    return [{ source: "/favicon.ico", destination: "/brand/tracmer-truck.svg" }];
  },
};

export default nextConfig;
