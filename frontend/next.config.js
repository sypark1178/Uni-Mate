/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** 개발 서버에서 오래된 페이지 청크를 너무 빨리 비워 새로고침 시 모듈 누락이 나는 것을 완화 */
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 10
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // 디스크 캐시 비활성화 시 HMR이 './NNN.js' 청크를 잃어버리는 경우가 있어
      // 메모리 캐시로 두어 EPERM 위험은 줄이면서 청크 참조 일관성을 유지한다.
      config.cache = { type: "memory" };
    }
    return config;
  }
};

module.exports = nextConfig;
