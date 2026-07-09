/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Tree-shake large barrel packages so only the used exports are bundled.
    optimizePackageImports: ['@react-three/drei', '@react-three/fiber', 'three'],
  },
};
module.exports = nextConfig;
