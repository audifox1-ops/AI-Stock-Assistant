import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

// 글로벌 변수로 간단한 인메모리 캐시 (서버 재시작 전까지 유지되는 폴백)
let lastMarketData: any = null;

export async function GET() {
  try {
    const symbols = {
      kospi: '^KS11',
      kosdaq: '^KQ11'
    };

    const results = await Promise.all([
      (yahooFinance.quote(symbols.kospi) as Promise<any>).catch(() => null),
      (yahooFinance.quote(symbols.kosdaq) as Promise<any>).catch(() => null)
    ]);

    const hasData = results[0] || results[1];
    
    const marketData = [
      {
        name: '코스피',
        symbol: symbols.kospi,
        price: results[0]?.regularMarketPrice || (lastMarketData ? lastMarketData[0].price : 0),
        changePercent: results[0]?.regularMarketChangePercent || (lastMarketData ? lastMarketData[0].changePercent : 0),
        success: !!results[0],
        isFallback: !results[0] && !!lastMarketData
      },
      {
        name: '코스닥',
        symbol: symbols.kosdaq,
        price: results[1]?.regularMarketPrice || (lastMarketData ? lastMarketData[1].price : 0),
        changePercent: results[1]?.regularMarketChangePercent || (lastMarketData ? lastMarketData[1].changePercent : 0),
        success: !!results[1],
        isFallback: !results[1] && !!lastMarketData
      }
    ];

    if (hasData) {
      lastMarketData = marketData;
    }

    return NextResponse.json(marketData);
  } catch (error) {
    console.error("[Market API] Critical Error:", error);
    return NextResponse.json(lastMarketData || [
      { name: '코스피', symbol: '^KS11', price: 0, changePercent: 0, success: false },
      { name: '코스닥', symbol: '^KQ11', price: 0, changePercent: 0, success: false }
    ]);
  }
}
