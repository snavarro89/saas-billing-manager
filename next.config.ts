import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  turbopack: {},
};

export default nextConfig;
