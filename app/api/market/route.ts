import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// [긴급 수정] 야후 파이낸스 에러 해결을 위해 인스턴스 초기화 방식 적용
const yahooFinance = new YahooFinance();

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
 * 공공데이터포털 지수 정보 가져오기 (폴백 용도)
 */
async function getPublicIndexData(name: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };

  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndexByItem";
    const basDt = '20260313'; // 데이터 공백 대응을 위한 고정 날짜

    const params = {
      resultType: 'json',
      numOfRows: '1',
      pageNo: '1',
      basDt: basDt,
      idxNm: name
    };

    const queryParams = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${queryParams}`;
    
    console.log(`[Market API] Requesting Public: ${maskUrl(fullUrl)}`);

    const res = await fetch(fullUrl, { cache: 'no-store' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { success: false, status: "(Error: JSON)" };
    }

    const item = data?.response?.body?.items?.item?.[0];
    if (item) {
      return {
        price: parseFloat(item.clpr),
        changePercent: parseFloat(item.fltRt),
        success: true,
        status: "공공데이터",
        basDt: basDt
      };
    }
  } catch (e) {
    return { success: false, status: "(Error: Public)" };
  }
  return { success: false, status: "(Error: NoData)" };
}

export async function GET() {
  try {
    const symbols = {
      kospi: { name: '코스피', ySymbol: '^KS11' },
      kosdaq: { name: '코스닥', ySymbol: '^KQ11' }
    };

    const results = await Promise.all([
      (async () => {
        // [지시사항] 야후 파이낸스를 최우선 메인으로 복구
        console.log("[Market API] Trying Yahoo (Main)...");
        try {
          const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>);
          if (yData && yData.regularMarketPrice) {
            return { 
              price: yData.regularMarketPrice, 
              changePercent: yData.regularMarketChangePercent, 
              success: true, 
              status: "야후 실시간" 
            };
          }
        } catch (err: any) {
          console.error("[Market API] Yahoo KOSPI Main Fail:", err.message);
        }

        // 야후 실패 시 공공데이터 폴백
        console.log("[Market API] Yahoo Fail -> Trying Public Fallback...");
        const pData = await getPublicIndexData('코스피');
        if (pData.success) return pData;
        
        return { ...EMERGENCY_FALLBACK[0], status: pData.status ? `비상 폴백 (${pData.status})` : "비상 폴백" };
      })(),
      (async () => {
        // [지시사항] 야후 파이낸스를 최우선 메인으로 복구
        console.log("[Market API] Trying Yahoo (Main)...");
        try {
          const yData = await (yahooFinance.quote(symbols.kosdaq.ySymbol) as Promise<any>);
          if (yData && yData.regularMarketPrice) {
            return { 
              price: yData.regularMarketPrice, 
              changePercent: yData.regularMarketChangePercent, 
              success: true, 
              status: "야후 실시간" 
            };
          }
        } catch (err: any) {
          console.error("[Market API] Yahoo KOSDAQ Main Fail:", err.message);
        }

        // 야후 실패 시 공공데이터 폴백
        console.log("[Market API] Yahoo Fail -> Trying Public Fallback...");
        const pData = await getPublicIndexData('코스닥');
        if (pData.success) return pData;
        
        return { ...EMERGENCY_FALLBACK[1], status: pData.status ? `비상 폴백 (${pData.status})` : "비상 폴백" };
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
