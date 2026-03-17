import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// IP별 요청 횟수를 저장할 인메모리 Map (Vercel Edge Runtime용)
// 실제 운영 환경에서는 더 정교한 Redis 도입을 권장하지만, 초기 방어벽으로 충분합니다.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// 제한 설정: 1분당 최대 10회
const LIMIT = 10;
const WINDOW_MS = 60 * 1000;

export function middleware(request: NextRequest) {
  // API 경로(/api/...)인 경우에만 Rate Limiting 적용
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Vercel 환경에서 IP 식별 (x-forwarded-for 또는 request.ip)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || '127.0.0.1';
    const now = Date.now();
    
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    // 윈도우 시간(1분)이 지났으면 카운트 초기화
    if (now - record.lastReset > WINDOW_MS) {
      record.count = 0;
      record.lastReset = now;
    }

    record.count += 1;
    rateLimitMap.set(ip, record);

    // 제한 초과 시 429 응답 반환
    if (record.count > LIMIT) {
      return new NextResponse(
        JSON.stringify({ 
          error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
          limit: LIMIT,
          window: "1min"
        }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }

  return NextResponse.next();
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: '/api/:path*',
};
