import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

// 비상용 임시 지수값
const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0.2, success: false, status: "비상 폴백" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: -0.1, success: false, status: "비상 폴백" }
];

/**
 * 공공데이터포털 지수 정보 가져오기 (인증 실패 정밀 추적)
 */
async function getPublicIndexData(name: string) {
  let serviceKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!serviceKey || serviceKey.includes('YOUR_PUBLIC')) return null;

  try {
    // 1. 하드코딩 교정: 이중 인코딩 방지를 위해 먼저 디코딩
    const decodedKey = decodeURIComponent(serviceKey);
    
    // idxNm은 공공데이터 서버 규격에 맞게 인코딩
    const url = `http://apis.data.go.kr/1160100/service/GetIndexPriceInfoService/getIndexPriceInfo?serviceKey=\${decodedKey}&resultType=json&numOfRows=1&idxNm=\${encodeURIComponent(name)}`;
    
    // 명확한 디버깅을 위해 호출 URL 로깅
    console.log(`[Market API] Requesting: \${url.substring(0, 100)}...`);

    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Market API] JSON Parse Error for \${name}: \${text.substring(0, 200)}`);
      return null;
    }

    // 2. 에러 코드 정밀 로깅 (인증 실패 원인 추적)
    const header = data?.response?.header;
    if (header?.resultCode !== "00") {
      console.error(`[Market API] API ERROR(\${name}) - Code: \${header?.resultCode}, Msg: \${header?.resultMsg}`);
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
    console.error(`[Market API] Critical Fetch Error for \${name}:`, e);
  }
  return null;
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    console.log("[Market API] Master Fetch Initiated...");

    const results = await Promise.all([
      (async () => {
        const pData = await getPublicIndexData('코스피');
        if (pData) return pData;
        const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        return { ...EMERGENCY_FALLBACK[0] };
      })(),
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
    console.error("[Market API] Global Master Error:", error.message);
    return NextResponse.json(EMERGENCY_FALLBACK);
  }
}
