/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Node-only / native deps must not be bundled (esp. for the Cloudflare Workers/OpenNext build).
    // Puppeteer (Chromium) and ioredis/bullmq (TCP) can't run on Workers — kept external and
    // imported dynamically so they only load on a Node host.
    serverComponentsExternalPackages: ["puppeteer", "bullmq", "ioredis"],
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
