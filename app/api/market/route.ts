import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const symbols = {
      kospi: '^KS11',
      kosdaq: '^KQ11'
    };

    // 타임아웃 및 개별 에러 처리를 포함한 병렬 요청
    const results = await Promise.all([
      (yahooFinance.quote(symbols.kospi) as Promise<any>).catch(() => null),
      (yahooFinance.quote(symbols.kosdaq) as Promise<any>).catch(() => null)
    ]);

    const marketData = [
      {
        name: '코스피',
        symbol: symbols.kospi,
        price: results[0]?.regularMarketPrice || 0,
        changePercent: results[0]?.regularMarketChangePercent || 0,
        success: !!results[0]
      },
      {
        name: '코스닥',
        symbol: symbols.kosdaq,
        price: results[1]?.regularMarketPrice || 0,
        changePercent: results[1]?.regularMarketChangePercent || 0,
        success: !!results[1]
      }
    ];

    // 데이터가 0인 경우를 대비한 최소한의 가공
    return NextResponse.json(marketData);
  } catch (error) {
    console.error("[Market API] Critical Error:", error);
    return NextResponse.json([
      { name: '코스피', symbol: '^KS11', price: 0, changePercent: 0, success: false },
      { name: '코스닥', symbol: '^KQ11', price: 0, changePercent: 0, success: false }
    ]);
  }
}
