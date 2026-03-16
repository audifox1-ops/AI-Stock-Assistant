import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 야후 파이낸스 인스턴스 초기화
const yahooFinance = new YahooFinance();

// [긴급 수정] Vercel/Next.js 캐싱 전면 차단
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPublicStockData(tickerOrName: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };
  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
    const basDt = '20260313';
    const cleanTicker = tickerOrName.trim();
    const isNumericTicker = /^\d{6}$/.test(cleanTicker);
    const srtnCd = isNumericTicker ? `A${cleanTicker}` : (cleanTicker.startsWith('A') ? cleanTicker.toUpperCase() : null);
    const params: Record<string, string> = { resultType: 'json', numOfRows: '1', pageNo: '1', basDt: basDt };
    if (srtnCd) params.srtnCd = srtnCd; else params.itmsNm = cleanTicker;
    const queryParams = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${queryParams}`;
    
    // [지시사항] 반드시 { cache: 'no-store' } 포함하여 매번 새로 가져오기
    const res = await fetch(fullUrl, { cache: 'no-store' });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { return { success: false, status: "(Error: JSON)" }; }
    const item = data?.response?.body?.items?.item?.[0];
    if (item) return { price: parseFloat(item.clpr), change: parseFloat(item.vs), changePercent: parseFloat(item.fltRt), success: true, status: "공공데이터" };
  } catch (e) { return { success: false, status: "(Error: Public)" }; }
  return { success: false, status: "(Error: NoData)" };
}

async function getYahooFallback(symbol: string) {
  const baseSymbol = symbol.split('.')[0];
  const extensions = ['.KS', '.KQ', '']; 
  for (const ext of extensions) {
    try {
      const target = `${baseSymbol}${ext}`;
      const quote = (await yahooFinance.quote(target)) as any;
      if (quote && quote.regularMarketPrice) return { price: quote.regularMarketPrice, changePercent: quote.regularMarketChangePercent || 0, change: quote.regularMarketChange || 0, success: true, status: "야후 실시간" };
    } catch (e) {}
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();
    if (!symbols || !Array.isArray(symbols)) return NextResponse.json({ error: "Invalid symbols" }, { status: 400 });
    const results = await Promise.all(symbols.map(async (s) => {
      let originalSymbol = s.toUpperCase().trim();
      try {
        let data = await getPublicStockData(originalSymbol);
        let finalData = data.success ? data : await getYahooFallback(originalSymbol);
        if (finalData && finalData.price) {
          await Promise.all([
            supabase.from('holdings').update({ last_price: finalData.price, price_updated_at: new Date().toISOString() }).eq('symbol', originalSymbol),
            supabase.from('alerts').update({ last_price: finalData.price, price_updated_at: new Date().toISOString() }).eq('symbol', originalSymbol)
          ]);
          return { symbol: originalSymbol, price: finalData.price, changePercent: finalData.changePercent, success: true, isFallback: finalData.status !== "공공데이터", status: finalData.status };
        }
        throw new Error("(Error: 03)");
      } catch (e: any) {
        const { data: hData } = await supabase.from('holdings').select('last_price').eq('symbol', originalSymbol).single();
        const fallbackPrice = hData?.last_price || 0;
        return { symbol: originalSymbol, price: fallbackPrice, success: fallbackPrice > 0, isFallback: true, status: "비상 폴백" };
      }
    }));
    return NextResponse.json(results.reduce((acc: any, curr) => ({ ...acc, [curr.symbol]: curr }), {}));
  } catch (error: any) { return NextResponse.json({ error: "Update Error" }, { status: 500 }); }
}
