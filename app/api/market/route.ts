import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 캐싱 강제 무효화
export const dynamic = 'force-dynamic';

// 비상용 임시 지수값
const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0, success: false, status: "비상 폴백" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: 0, success: false, status: "비상 폴백" }
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
        ? `${key.substring(0, 3)}***${key.substring(key.length - 3)}`
        : "***";
      urlObj.searchParams.set('serviceKey', masked);
    }
    return urlObj.toString();
  } catch (e) {
    return url.substring(0, 50) + "...";
  }
}

/**
 * 공공데이터포털 지수 정보 가져오기 (강제 강결합 모드)
 */
async function getPublicIndexData(name: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };

  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetIndexPriceInfoService/getMarketIndexInfo";
    
    // [하드코딩] 월요일 대응을 위한 지난주 금요일 데이터 강제 고정 테스트
    const basDt = '20260313';

    const params = {
      resultType: 'json',
      numOfRows: '1',
      pageNo: '1',
      basDt: basDt,
      idxNm: name
    };

    const queryParams = new URLSearchParams(params).toString();
    
    // [지시사항] 서비스 키를 Raw 형태로 직접 삽입하여 이중 인코딩 방지
    const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${queryParams}`;
    
    console.log(`[Market API] Forced Requesting: ${maskUrl(fullUrl)}`);

    const res = await fetch(fullUrl, { cache: 'no-store' });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Market API] JSON Parse Error: ${text.substring(0, 100)}`);
      return { success: false, status: "(Error: JSON)" };
    }

    const header = data?.response?.header;
    const resultCode = header?.resultCode;

    if (resultCode !== "00") {
      console.error(`[Market API] FAIL (${name}) - Code: ${resultCode}`);
      return { success: false, status: `(Error: ${resultCode})` };
    }

    const item = data?.response?.body?.items?.item?.[0];

    if (item) {
      console.log(`[Market API] SUCCESS (${name}, ${basDt}): ${item.clpr}`);
      return {
        price: parseFloat(item.clpr),
        changePercent: parseFloat(item.fltRt),
        success: true,
        status: "공공데이터",
        basDt: basDt
      };
    }
  } catch (e: any) {
    console.error(`[Market API] ERROR (${name}):`, e.message);
    return { success: false, status: `(Error: Connection)` };
  }
  return { success: false, status: "(Error: 03)" };
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    const results = await Promise.all([
      (async () => {
        const pData = await getPublicIndexData('코스피');
        if (pData.success) return pData;
        
        console.log("[Market API] KOSPI Primary Fail -> Trying Yahoo...");
        const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        
        return { ...EMERGENCY_FALLBACK[0], status: pData.status ? `비상 폴백 ${pData.status}` : "비상 폴백" };
      })(),
      (async () => {
        const pData = await getPublicIndexData('코스닥');
        if (pData.success) return pData;

        console.log("[Market API] KOSDAQ Primary Fail -> Trying Yahoo...");
        const yData = await (yahooFinance.quote(symbols.kosdaq.ySymbol) as Promise<any>).catch(() => null);
        if (yData) return { price: yData.regularMarketPrice, changePercent: yData.regularMarketChangePercent, success: true, status: "야후 폴백" };
        
        return { ...EMERGENCY_FALLBACK[1], status: pData.status ? `비상 폴백 ${pData.status}` : "비상 폴백" };
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
