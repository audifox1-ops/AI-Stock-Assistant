import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

/**
 * 보안을 위해 URL 마스킹 (Vercel 로그용)
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
 * 공공데이터포털 주식 시세 정보 (날짜 하드코딩 + Raw 인증키)
 */
async function getPublicStockData(tickerOrName: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return { success: false, status: "Key Missing" };

  try {
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
    
    // [하드코딩] 월요일 아침 대응: 지난주 금요일 데이터 강제 지정
    const basDt = "20260313";

    const cleanTicker = tickerOrName.trim();
    const isNumericTicker = /^\d{6}$/.test(cleanTicker);
    const isATicker = /^A\d{6}$/i.test(cleanTicker);

    // 검색 대상 설정
    const searchEntries: Record<string, string>[] = [];
    if (isNumericTicker || isATicker) {
      const srtnCd = isNumericTicker ? `A${cleanTicker}` : cleanTicker.toUpperCase();
      searchEntries.push({ srtnCd });
    } else {
      searchEntries.push({ itmsNm: cleanTicker });
    }

    for (const entry of searchEntries) {
      const key = Object.keys(entry)[0];
      const val = Object.values(entry)[0];

      // [핵심] Service Key를 인코딩 없이 'Raw'로 직접 연결
      const otherParams = new URLSearchParams({
        resultType: 'json',
        numOfRows: '1',
        pageNo: '1',
        basDt: basDt,
        [key]: val
      });

      // 문자열 템플릿을 통한 강제 결합
      const fullUrl = `${baseUrl}?serviceKey=${process.env.PUBLIC_DATA_PORTAL_KEY}&${otherParams.toString()}`;
      
      console.log(`[Stock API] Requesting (Hardcoded): ${maskUrl(fullUrl)}`);

      const res = await fetch(fullUrl, { cache: 'no-store' });
      const text = await res.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error(`[Stock API] JSON Parse Error: ${text.substring(0, 100)}`);
        return { success: false, status: "(Error: JSON)" };
      }

      const header = data?.response?.header;
      const resultCode = header?.resultCode;

      if (resultCode !== "00") {
        console.error(`[Stock API] FAIL - Code: ${resultCode}, Msg: ${header?.resultMsg}`);
        return { success: false, status: `(Error: ${resultCode})` };
      }

      const item = data?.response?.body?.items?.item?.[0];
      if (item) {
        console.log(`[Stock API] SUCCESS (${basDt}): ${item.clpr}`);
        return {
          price: parseFloat(item.clpr),
          change: parseFloat(item.vs),
          changePercent: parseFloat(item.fltRt),
          success: true,
          status: "공공데이터",
          basDt: basDt
        };
      }
    }
  } catch (e: any) {
    console.error(`[Stock API] Critical Error:`, e.message);
    return { success: false, status: `(Error: Connection)` };
  }
  return { success: false, status: "(Error: 03)" };
}

/**
 * 야후 파이낸스 폴백
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

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "올바른 종목 코드 형식이 아닙니다." }, { status: 400 });
    }

    const results = await Promise.all(
      symbols.map(async (s) => {
        let originalSymbol = s.toUpperCase().trim();
        
        try {
          // 1. 공공데이터 우선
          let data = await getPublicStockData(originalSymbol);
          let finalData = data.success ? data : null;
          
          // 2. 실패 시 야후
          if (!finalData) {
            finalData = await getYahooFallback(originalSymbol);
          }

          if (finalData && finalData.price) {
            // 성공 시 DB 업데이트
            await Promise.all([
              supabase.from('holdings').update({ 
                last_price: finalData.price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol),
              supabase.from('alerts').update({ 
                last_price: finalData.price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol)
            ]);

            return {
              symbol: originalSymbol,
              price: finalData.price,
              changePercent: finalData.changePercent,
              change: finalData.change || 0,
              success: true,
              isFallback: finalData.status !== "공공데이터",
              status: finalData.status
            };
          }
          
          throw new Error(data.status || "(Error: 03)");
        } catch (e: any) {
          console.error(`[Stock API] Fallback for ${originalSymbol}: ${e.message}`);
          
          const { data: holdingData } = await supabase.from('holdings').select('last_price').eq('symbol', originalSymbol).single();
          const { data: alertData } = await supabase.from('alerts').select('last_price').eq('symbol', originalSymbol).single();
          
          const fallbackPrice = holdingData?.last_price || alertData?.last_price || 0;

          return { 
            symbol: originalSymbol, 
            price: fallbackPrice, 
            changePercent: 0, 
            success: fallbackPrice > 0, 
            isFallback: true,
            status: e.message.includes('Error') ? `비상 폴백 ${e.message}` : "비상 폴백"
          };
        }
      })
    );

    const priceMap = results.reduce((acc: any, curr) => {
      acc[curr.symbol] = curr;
      return acc;
    }, {});

    return NextResponse.json(priceMap);
  } catch (error: any) {
    console.error("[Stock API] Severe POST Error:", error.message);
    return NextResponse.json({ error: "데이터 업데이트 오류" }, { status: 500 });
  }
}
