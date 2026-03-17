/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프로덕션 빌드 시 콘솔 로그 제거 설정 (보안 강화)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  // API 및 이미지 관련 추가 설정이 필요한 경우 여기에 작성
};

export default nextConfig;
