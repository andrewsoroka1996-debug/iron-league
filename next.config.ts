import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [70, 75],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;