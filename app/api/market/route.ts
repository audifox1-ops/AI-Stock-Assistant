import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const symbols = {
      kospi: '^KS11',
      kosdaq: '^KQ11'
    };

    // Type casting to handle promise results properly in TS
    const results = await Promise.all([
      (yahooFinance.quote(symbols.kospi) as Promise<any>).catch(() => null),
      (yahooFinance.quote(symbols.kosdaq) as Promise<any>).catch(() => null)
    ]);

    const marketData = [
      {
        name: 'KOSPI',
        symbol: symbols.kospi,
        price: results[0]?.regularMarketPrice || 0,
        changePercent: results[0]?.regularMarketChangePercent || 0,
        success: !!results[0]
      },
      {
        name: 'KOSDAQ',
        symbol: symbols.kosdaq,
        price: results[1]?.regularMarketPrice || 0,
        changePercent: results[1]?.regularMarketChangePercent || 0,
        success: !!results[1]
      }
    ];

    return NextResponse.json(marketData);
  } catch (error) {
    console.error("[Market API] Global Error:", error);
    return NextResponse.json([
      { name: 'KOSPI', symbol: '^KS11', price: 0, changePercent: 0, success: false },
      { name: 'KOSDAQ', symbol: '^KQ11', price: 0, changePercent: 0, success: false }
    ]);
  }
}
