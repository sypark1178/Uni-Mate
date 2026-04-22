/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows 환경에서 .next 캐시 파일 접근 오류(UNKNOWN/EPERM) 회피
      config.cache = false;
    }
    return config;
  }
};

module.exports = nextConfig;
