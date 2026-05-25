import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  webpack: (config, { isServer }) => {
    console.log('Webpack symlinks before for', isServer ? 'server' : 'client', ':', config.resolve?.symlinks);
    if (config.resolve) {
      config.resolve.symlinks = false;
    }
    config.cache = false; // Disable webpack filesystem caching to prevent readlink panics on Windows
    console.log('Webpack symlinks after for', isServer ? 'server' : 'client', ':', config.resolve?.symlinks);
    return config;
  },
  turbopack: {},
};

export default nextConfig;
