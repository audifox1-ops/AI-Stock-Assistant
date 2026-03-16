import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

// 야후 파이낸스 인스턴스 초기화
const yahooFinance = new YahooFinance();

// Vercel 캐싱 차단
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EMERGENCY_FALLBACK = [
  { name: '코스피', symbol: '^KS11', price: 2605.4, changePercent: 0, success: false, status: "비상 폴백" },
  { name: '코스닥', symbol: '^KQ11', price: 872.1, changePercent: 0, success: false, status: "비상 폴백" }
];

// 한국 시간(KST) 포맷팅 함수
function getKstTimestamp() {
  return new Date().toLocaleTimeString('ko-KR', { 
    timeZone: 'Asia/Seoul', 
    hour12: false,
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

async function getPublicIndexData(name: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };
  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndexByItem";
    const basDt = '20260313';
    const params = { resultType: 'json', numOfRows: '1', pageNo: '1', basDt: basDt, idxNm: name };
    const queryParams = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${queryParams}`;
    
    const res = await fetch(fullUrl, { cache: 'no-store' });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { return { success: false, status: "(Error: JSON)" }; }
    const item = data?.response?.body?.items?.item?.[0];
    if (item) return { 
      price: parseFloat(item.clpr), 
      changePercent: parseFloat(item.fltRt), 
      success: true, 
      status: "공공데이터", 
      basDt: basDt,
      updatedAt: getKstTimestamp()
    };
  } catch (e) { return { success: false, status: "(Error: Public)" }; }
  return { success: false, status: "(Error: NoData)" };
}

export async function GET() {
  const updatedAt = getKstTimestamp();
  try {
    const symbols = { kospi: { name: '코스피', ySymbol: '^KS11' }, kosdaq: { name: '코스닥', ySymbol: '^KQ11' } };
    const results = await Promise.all([
      (async () => {
        try {
          const yData = await (yahooFinance.quote(symbols.kospi.ySymbol) as Promise<any>);
          if (yData && yData.regularMarketPrice) return { 
            price: yData.regularMarketPrice, 
            changePercent: yData.regularMarketChangePercent, 
            success: true, 
            status: "야후 실시간",
            updatedAt: updatedAt
          };
        } catch (err) {}
        const pData = await getPublicIndexData('코스피');
        if (pData.success) return pData;
        return { ...EMERGENCY_FALLBACK[0], status: "비상 폴백", updatedAt: updatedAt };
      })(),
      (async () => {
        try {
          const yData = await (yahooFinance.quote(symbols.kosdaq.ySymbol) as Promise<any>);
          if (yData && yData.regularMarketPrice) return { 
            price: yData.regularMarketPrice, 
            changePercent: yData.regularMarketChangePercent, 
            success: true, 
            status: "야후 실시간",
            updatedAt: updatedAt
          };
        } catch (err) {}
        const pData = await getPublicIndexData('코스닥');
        if (pData.success) return pData;
        return { ...EMERGENCY_FALLBACK[1], status: "비상 폴백", updatedAt: updatedAt };
      })()
    ]);
    return NextResponse.json([
      { name: '코스피', symbol: symbols.kospi.ySymbol, ...results[0] }, 
      { name: '코스닥', symbol: symbols.kosdaq.ySymbol, ...results[1] }
    ]);
  } catch (error: any) { 
    return NextResponse.json(EMERGENCY_FALLBACK.map(f => ({ ...f, updatedAt: updatedAt }))); 
  }
}
