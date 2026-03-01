
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ✅ Pin Turbopack to the actual package directory (where this config lives)
  turbopack: {
    root: path.resolve(__dirname),
  },
  /* config options here */
};

export default nextConfig;
