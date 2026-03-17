import { auth } from "./auth";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// IP별 요청 횟수를 저장할 인메모리 Map (Vercel Edge Runtime용)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// 제한 설정: 1분당 최대 10회
const LIMIT = 10;
const WINDOW_MS = 60 * 1000;

export default auth((req) => {
  const { nextUrl } = req;
  
  // 1. API 경로(/api/...)인 경우에만 Rate Limiting 적용
  if (nextUrl.pathname.startsWith('/api')) {
    // NextAuthRequest 타입에는 .ip가 직접 노출되지 않을 수 있으므로 헤더에서 먼저 가져옵니다.
    // 타입 에러 방지를 위해 req를 NextRequest로 취급하거나 헤더만 사용합니다.
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : (req as any).ip || '127.0.0.1';
    
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > WINDOW_MS) {
      record.count = 0;
      record.lastReset = now;
    }

    record.count += 1;
    rateLimitMap.set(ip, record);

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

  // 2. 인증 로직 및 기타 경로는 다음으로 진행
  return NextResponse.next();
});

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|sw.js).*)"],
};
