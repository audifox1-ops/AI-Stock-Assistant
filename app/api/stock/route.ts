import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "올바른 종목 코드 형식이 아닙니다." }, { status: 400 });
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);
          
          return {
            symbol,
            price: quote?.regularMarketPrice || 0,
            changePercent: quote?.regularMarketChangePercent || 0,
            volume: quote?.regularMarketVolume || 0,
            avgVolume: quote?.averageDailyVolume3Month || quote?.averageDailyVolume10Day || 0,
            prevClose: quote?.regularMarketPreviousClose || 0,
            success: !!quote
          };
        } catch (e) {
          console.error(`[Stock API] Error fetching \${symbol}:`, e);
          return { symbol, price: 0, changePercent: 0, error: true, success: false };
        }
      })
    );

    const priceMap = results.reduce((acc: any, curr) => {
      acc[curr.symbol] = curr;
      return acc;
    }, {});

    return NextResponse.json(priceMap);
  } catch (error) {
    console.error("[Stock API] Global Error:", error);
    return NextResponse.json({ error: "실시간 데이터를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
