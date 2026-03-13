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
 * 보안을 위해 URL 마스킹 처리 (디버깅용)
 */
function maskUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const key = urlObj.searchParams.get('serviceKey');
    if (key) {
      const masked = key.length > 6 
        ? `\${key.substring(0, 3)}***\${key.substring(key.length - 3)}`
        : "***";
      urlObj.searchParams.set('serviceKey', masked);
    }
    return urlObj.toString();
  } catch (e) {
    return url.substring(0, 50) + "...";
  }
}

/**
 * 공공데이터포털 지수 정보 가져오기 (전면 리팩토링)
 */
async function getPublicIndexData(name: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return null;

  try {
    // 1. 인증키 정규화: 기인코딩된 경우를 대비해 디코딩 후 사용
    const serviceKey = decodeURIComponent(rawKey);
    
    // URLSearchParams를 쓰지 않고 명시적으로 URL 구성 (이중 인코딩 방지)
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetIndexPriceInfoService/getIndexPriceInfo";
    const queryParams = `?serviceKey=\${serviceKey}&resultType=json&numOfRows=1&idxNm=\${encodeURIComponent(name)}`;
    const fullUrl = baseUrl + queryParams;
    
    // 마스킹된 URL 로깅 (Vercel 로그 확인용)
    console.log(`[Market API] Requesting: \${maskUrl(fullUrl)}`);

    const res = await fetch(fullUrl, { cache: 'no-store' });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Market API] JSON Parse Error (\${name}): \${text.substring(0, 200)}`);
      return null;
    }

    // 상세 응답 로깅
    const header = data?.response?.header;
    const resultCode = header?.resultCode;
    const resultMsg = header?.resultMsg;

    if (resultCode !== "00") {
      console.error(`[Market API] FAIL (\${name}) - Code: \${resultCode}, Msg: \${resultMsg}`);
      return null;
    }

    const item = data?.response?.body?.items?.item?.[0];

    if (item) {
      console.log(`[Market API] SUCCESS (\${name}): \${item.clpr}`);
      return {
        price: parseFloat(item.clpr),
        changePercent: parseFloat(item.fltRt),
        success: true,
        status: "공공데이터"
      };
    } else {
      console.warn(`[Market API] EMPTY (\${name}): Data exists but item not found in response.`);
    }
  } catch (e: any) {
    console.error(`[Market API] ERROR (\${name}):`, e.message);
  }
  return null;
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    console.log("[Market API] Fetching Indices...");

    const results = await Promise.all([
      (async () => {
        const pData = await getPublicIndexData('코스피');
        if (pData) return pData;
        
        console.log("[Market API] KOSPI Primary Fail -> Trying Yahoo...");
        const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        
        return { ...EMERGENCY_FALLBACK[0] };
      })(),
      (async () => {
        const pData = await getPublicIndexData('코스닥');
        if (pData) return pData;

        console.log("[Market API] KOSDAQ Primary Fail -> Trying Yahoo...");
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
    console.error("[Market API] Critical Global Error:", error.message);
    return NextResponse.json(EMERGENCY_FALLBACK);
  }
}
