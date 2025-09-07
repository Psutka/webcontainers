/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {}
  },
  eslint: {
    dirs: ['src']
  }
}

module.exports = nextConfig