import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Hostinger's build container cannot start a worker per CPU, so page data is collected in one worker.
    cpus: 1,
  },
};

export default nextConfig;
