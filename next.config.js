const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: "NetworkOnly",
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  devIndicators: false,
  // Allow HMR WebSocket from any local network host in dev
  allowedDevHosts: ["all"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vnqyzthjviyljhplvzay.supabase.co",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
