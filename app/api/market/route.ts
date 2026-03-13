import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 무효화 및 매번 최신 데이터 가져오기 강제
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 코스피 (^KS11), 코스닥 (^KQ11) 티커 정의
    const marketSymbols = [
      { symbol: '^KS11', name: 'KOSPI' },
      { symbol: '^KQ11', name: 'KOSDAQ' }
    ];

    const results = await Promise.all(
      marketSymbols.map(async (market) => {
        try {
          const quote: any = await yahooFinance.quote(market.symbol);
          return {
            name: market.name,
            symbol: market.symbol,
            price: quote?.regularMarketPrice || 0,
            changePercent: quote?.regularMarketChangePercent || 0,
            success: !!quote
          };
        } catch (e) {
          console.error(`[Market API] Error fetching ${market.name}:`, e);
          return { name: market.name, symbol: market.symbol, price: 0, changePercent: 0, error: true, success: false };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Market API] Global Error:", error);
    return NextResponse.json({ error: "시장 지수를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
