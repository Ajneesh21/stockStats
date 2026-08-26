/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["ioredis", "xlsx"],
  turbopack: {},
};

export default nextConfig;
