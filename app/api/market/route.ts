import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

const PUBLIC_KEY = process.env.PUBLIC_DATA_PORTAL_KEY;

// 비상용 임시 지수값 (모든 시도 실패 시)
const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0.2, success: false, status: "비상 폴백" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: -0.1, success: false, status: "비상 폴백" }
];

/**
 * 공공데이터포털에서 지수 정보를 가져옵니다.
 */
async function getPublicIndexData(name: string) {
  if (!PUBLIC_KEY || PUBLIC_KEY.includes('YOUR_PUBLIC')) return null;

  try {
    const url = `http://apis.data.go.kr/1160100/service/GetIndexPriceInfoService/getIndexPriceInfo?serviceKey=\${PUBLIC_KEY}&resultType=json&numOfRows=1&idxNm=\${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item?.[0];

    if (item) {
      return {
        price: parseFloat(item.clpr),
        changePercent: parseFloat(item.fltRt),
        success: true,
        status: "공공데이터"
      };
    }
  } catch (e) {
    console.error(`[Market API] Public Data Portal Error for \${name}:`, e);
  }
  return null;
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    console.log("[Market API] Fetching indices...");

    const results = await Promise.all([
      // 1. 코스피 시도
      (async () => {
        let data = await getPublicIndexData('코스피');
        if (!data) {
          const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>).catch(() => null);
          if (yData) data = { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        }
        return data || { ...EMERGENCY_FALLBACK[0] };
      })(),
      // 2. 코스닥 시도
      (async () => {
        let data = await getPublicIndexData('코스닥');
        if (!data) {
          const yData = await (yahooFinance.quote(symbols.kosdaq.ySymbol) as Promise<any>).catch(() => null);
          if (yData) data = { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        }
        return data || { ...EMERGENCY_FALLBACK[1] };
      })()
    ]);

    const marketData = [
      { name: '코스피', symbol: symbols.kospi.ySymbol, ...results[0] },
      { name: '코스닥', symbol: symbols.kosdaq.ySymbol, ...results[1] }
    ];

    return NextResponse.json(marketData);
  } catch (error: any) {
    console.error("[Market API] Global Critical Error:", error.message);
    return NextResponse.json(EMERGENCY_FALLBACK);
  }
}
