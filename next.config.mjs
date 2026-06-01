/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Sharp and node-only deps used by API routes / workers should not be bundled for the client.
    serverComponentsExternalPackages: ["sharp", "bullmq", "ioredis"],
  },
  images: {
    // Supabase Storage public URLs will be added here when wiring real storage.
    remotePatterns: [],
  },
  webpack: (config) => {
    // Konva's node entry optionally requires the native `canvas` package. react-konva runs
    // client-side only (dynamically imported with ssr:false), so stub it out to avoid a
    // "Can't resolve 'canvas'" bundler error.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
