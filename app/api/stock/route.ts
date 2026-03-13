import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 무효화 및 매번 최신 데이터 가져오기 강제
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();

    console.log("[Stock API] Requested symbols:", symbols);

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "올바른 종목 코드 형식이 아닙니다." }, { status: 400 });
    }

    // 야후 파이낸스에서 여러 종목의 현재 정보 개별적으로 가져오기 (하나의 에러가 전체를 망치지 않게 처리)
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);
          console.log(`[Stock API] Response for ${symbol}:`, quote ? "Success" : "Empty");
          
          return {
            symbol,
            price: quote?.regularMarketPrice || 0,
            changePercent: quote?.regularMarketChangePercent || 0,
            currency: quote?.currency || 'KRW',
            success: !!quote
          };
        } catch (e) {
          console.error(`[Stock API] Error fetching ${symbol}:`, e);
          return { symbol, price: 0, changePercent: 0, error: true, success: false };
        }
      })
    );

    // 결과 데이터를 맵 형태로 반환
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
