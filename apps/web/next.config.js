/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sparkderby/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
