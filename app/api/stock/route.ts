import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

/**
 * 보안을 위해 URL 마스킹
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
 * 공공데이터포털 주식 시세 (원시 응답 추적 버전)
 */
async function getPublicStockData(tickerOrName: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };

  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
    const basDt = '20260313'; // [하드코딩]

    const cleanTicker = tickerOrName.trim();
    const isNumericTicker = /^\d{6}$/.test(cleanTicker);
    const srtnCd = isNumericTicker ? `A${cleanTicker}` : (cleanTicker.startsWith('A') ? cleanTicker.toUpperCase() : null);

    const params: Record<string, string> = {
      resultType: 'json', // [지시사항] JSON 파라미터 확인
      numOfRows: '1',
      pageNo: '1',
      basDt: basDt
    };

    if (srtnCd) params.srtnCd = srtnCd;
    else params.itmsNm = cleanTicker;

    const queryParams = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${queryParams}`;
    
    console.log(`[Stock API] Requesting: ${maskUrl(fullUrl)}`);

    const res = await fetch(fullUrl, { cache: 'no-store' });
    
    // [지시사항] 원시 응답 로깅
    const rawText = await res.text();
    console.log(`[Stock API] API 원시 응답 (${tickerOrName}):`, rawText);
    
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error(`[Stock API] JSON Parse Error for ${tickerOrName}. Raw response: ${rawText.substring(0, 50)}`);
      return { success: false, status: "(Error: JSON)" };
    }

    const header = data?.response?.header;
    const resultCode = header?.resultCode;

    if (resultCode !== "00") {
      console.error(`[Stock API] FAIL - Code: ${resultCode}`);
      return { success: false, status: `(Error: ${resultCode})` };
    }

    const item = data?.response?.body?.items?.item?.[0];
    if (item) {
      console.log(`[Stock API] SUCCESS (${tickerOrName}): ${item.clpr}`);
      return {
        price: parseFloat(item.clpr),
        change: parseFloat(item.vs),
        changePercent: parseFloat(item.fltRt),
        success: true,
        status: "공공데이터",
        basDt: basDt
      };
    }
  } catch (e: any) {
    console.error(`[Stock API] Error:`, e.message);
    return { success: false, status: `(Error: Connection)` };
  }
  return { success: false, status: "(Error: 03)" };
}

/**
 * 야후 폴백
 */
async function getYahooFallback(symbol: string) {
  const baseSymbol = symbol.split('.')[0];
  const extensions = ['.KS', '.KQ', '']; 
  for (const ext of extensions) {
    try {
      const target = `${baseSymbol}${ext}`;
      const quote = (await yahooFinance.quote(target)) as any;
      if (quote && quote.regularMarketPrice) {
        return {
          price: quote.regularMarketPrice,
          changePercent: quote.regularMarketChangePercent || 0,
          change: quote.regularMarketChange || 0,
          success: true,
          status: "야후 폴백"
        };
      }
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
        throw new Error(data.status || "(Error: 03)");
      } catch (e: any) {
        const { data: hData } = await supabase.from('holdings').select('last_price').eq('symbol', originalSymbol).single();
        const fallbackPrice = hData?.last_price || 0;
        return { symbol: originalSymbol, price: fallbackPrice, success: fallbackPrice > 0, isFallback: true, status: e.message.includes('Error') ? `비상 폴백 ${e.message}` : "비상 폴백" };
      }
    }));
    return NextResponse.json(results.reduce((acc: any, curr) => ({ ...acc, [curr.symbol]: curr }), {}));
  } catch (error: any) { return NextResponse.json({ error: "Update Error" }, { status: 500 }); }
}
