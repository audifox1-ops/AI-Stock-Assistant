import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "올바른 종목 코드 형식이 아닙니다." }, { status: 400 });
    }

    // 야후 파이낸스에서 여러 종목의 현재 정보 한꺼번에 가져오기
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);
          return {
            symbol,
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            currency: quote.currency
          };
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return { symbol, price: 0, changePercent: 0, error: true };
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
    console.error("Yahoo Finance API Error:", error);
    return NextResponse.json({ error: "실시간 데이터를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
