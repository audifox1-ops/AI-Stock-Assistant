import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

// 비상용 임시 지수값 (데이터 호출 실패 시 화면 깨짐 방지)
const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0.2, success: false, status: "데이터 점검 중" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: -0.1, success: false, status: "데이터 점검 중" }
];

export async function GET() {
  try {
    const symbols = {
      kospi: '^KS11',
      kosdaq: '^KQ11'
    };

    console.log("[Market API] Fetching indices from Yahoo Finance...");

    const results = await Promise.all([
      (yahooFinance.quote(symbols.kospi) as Promise<any>).catch(err => {
        console.error(`[Market API] KOSPI Error: \${err.message}`);
        return null;
      }),
      (yahooFinance.quote(symbols.kosdaq) as Promise<any>).catch(err => {
        console.error(`[Market API] KOSDAQ Error: \${err.message}`);
        return null;
      })
    ]);

    // 결과 매핑
    const marketData = [
      {
        name: '코스피',
        symbol: symbols.kospi,
        price: results[0]?.regularMarketPrice || EMERGENCY_FALLBACK[0].price,
        changePercent: results[0]?.regularMarketChangePercent || EMERGENCY_FALLBACK[0].changePercent,
        success: !!results[0],
        status: results[0] ? "실시간" : "데이터 점검 중"
      },
      {
        name: '코스닥',
        symbol: symbols.kosdaq,
        price: results[1]?.regularMarketPrice || EMERGENCY_FALLBACK[1].price,
        changePercent: results[1]?.regularMarketChangePercent || EMERGENCY_FALLBACK[1].changePercent,
        success: !!results[1],
        status: results[1] ? "실시간" : "데이터 점검 중"
      }
    ];

    return NextResponse.json(marketData);
  } catch (error: any) {
    console.error("[Market API] Global Critical Error:", error.message);
    return NextResponse.json(EMERGENCY_FALLBACK);
  }
}
