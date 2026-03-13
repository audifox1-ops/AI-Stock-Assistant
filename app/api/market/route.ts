import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

// 비상용 임시 지수값 (모든 시도 실패 시 화면 깨짐 방지)
const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0.2, success: false, status: "비상 폴백" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: -0.1, success: false, status: "비상 폴백" }
];

/**
 * 공공데이터포털 지수 정보 가져오기 (인코딩 이슈 대응)
 */
async function getPublicIndexData(name: string) {
  let serviceKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!serviceKey || serviceKey.includes('YOUR_PUBLIC')) return null;

  // 인증키가 이미 인코딩되어 있을 수 있으므로, 디코딩 후 다시 안전하게 인코딩
  try {
    const decodedKey = decodeURIComponent(serviceKey);
    const encodedKey = encodeURIComponent(decodedKey);

    const url = `http://apis.data.go.kr/1160100/service/GetIndexPriceInfoService/getIndexPriceInfo?serviceKey=\${encodedKey}&resultType=json&numOfRows=1&idxNm=\${encodeURIComponent(name)}`;
    
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Market API] JSON Parse Error for \${name}:`, text.substring(0, 100));
      return null;
    }

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
    console.error(`[Market API] Public Data Portal Critical Error for \${name}:`, e);
  }
  return null;
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    console.log("[Market API] Fetching balanced indices...");

    const results = await Promise.all([
      // 코스피 전략
      (async () => {
        const pData = await getPublicIndexData('코스피');
        if (pData) return pData;
        const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        return { ...EMERGENCY_FALLBACK[0] };
      })(),
      // 코스닥 전략
      (async () => {
        const pData = await getPublicIndexData('코스닥');
        if (pData) return pData;
        const yData = await (yahooFinance.quote(symbols.kosdaq.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        return { ...EMERGENCY_FALLBACK[1] };
      })()
    ]);

    const marketData = [
      { name: '코스피', symbol: symbols.kospi.ySymbol, ...results[0] },
      { name: '코스닥', symbol: symbols.kosdaq.ySymbol, ...results[1] }
    ];

    return NextResponse.json(marketData);
  } catch (error: any) {
    console.error("[Market API] Global Error:", error.message);
    return NextResponse.json(EMERGENCY_FALLBACK);
  }
}
