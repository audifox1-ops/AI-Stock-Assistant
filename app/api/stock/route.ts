import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

/**
 * 공공데이터포털 주식 시세 정보 (인증 실패 정밀 추격 리팩토링)
 */
async function getPublicStockData(tickerOrName: string) {
  let serviceKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!serviceKey || serviceKey.includes('YOUR_PUBLIC')) return null;

  try {
    // 1. 하드코딩 교정: 이중 인코딩 차단
    const decodedKey = decodeURIComponent(serviceKey);
    
    const isCode = /^\d{6}$/.test(tickerOrName);
    const param = isCode ? `likeSrtnCd=\${tickerOrName}` : `itmsNm=\${encodeURIComponent(tickerOrName)}`;
    
    // 금융위원회 주식시세정보 (getStockPriceInfo)
    const url = `http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo?serviceKey=\${decodedKey}&resultType=json&numOfRows=1&\${param}`;
    
    console.log(`[Stock API] Calling URL for \${tickerOrName}: \${url.substring(0, 100)}...`);

    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[Stock API] JSON Parse Error(\${tickerOrName}): \${text.substring(0, 200)}`);
      return null;
    }

    // 2. 에러 코드 정밀 로깅 (resultCode 추적)
    const header = data?.response?.header;
    if (header?.resultCode !== "00") {
      console.error(`[Stock API] API ERROR(\${tickerOrName}) - Code: \${header?.resultCode}, Msg: \${header?.resultMsg}`);
      return null;
    }

    const item = data?.response?.body?.items?.item?.[0];

    if (item) {
      return {
        price: parseFloat(item.clpr), // 종가
        change: parseFloat(item.vs), // 전일대비
        changePercent: parseFloat(item.fltRt), // 등락률
        success: true,
        status: "공공데이터"
      };
    } else {
      console.warn(`[Stock API] No item found for \${tickerOrName} in public response.`);
    }
  } catch (e) {
    console.error(`[Stock API] Critical Fetch Error for \${tickerOrName}:`, e);
  }
  return null;
}

/**
 * 야후 파이낸스 폴백 로직
 */
async function getYahooFallback(symbol: string) {
  const baseSymbol = symbol.split('.')[0];
  const extensions = ['.KS', '.KQ', '']; 

  for (const ext of extensions) {
    try {
      const target = `\${baseSymbol}\${ext}`;
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

    console.log(`[Stock API] Batch Update Started for \${symbols.length} symbols...`);

    const results = await Promise.all(
      symbols.map(async (s) => {
        let originalSymbol = s.toUpperCase().trim();
        
        try {
          // 1. 공공데이터 우선 호출
          let data = await getPublicStockData(originalSymbol);
          
          // 2. 실패 시 야후 파이낸스 폴백
          if (!data) {
            data = await getYahooFallback(originalSymbol);
          }

          if (data && data.price) {
            // 성공 시 DB 업데이트
            await Promise.all([
              supabase.from('holdings').update({ 
                last_price: data.price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol),
              supabase.from('alerts').update({ 
                last_price: data.price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol)
            ]);

            return {
              symbol: originalSymbol,
              price: data.price,
              changePercent: data.changePercent,
              change: data.change || 0,
              success: true,
              isFallback: data.status !== "공공데이터",
              status: data.status
            };
          }
          throw new Error("Data fetch failed from all sources");
        } catch (e: any) {
          console.error(`[Stock API] Master Retry/Fallback Error for \${originalSymbol}: \${e.message}`);
          
          const { data: holdingData } = await supabase.from('holdings').select('last_price').eq('symbol', originalSymbol).single();
          const { data: alertData } = await supabase.from('alerts').select('last_price').eq('symbol', originalSymbol).single();
          
          const fallbackPrice = holdingData?.last_price || alertData?.last_price || 0;

          return { 
            symbol: originalSymbol, 
            price: fallbackPrice, 
            changePercent: 0, 
            success: fallbackPrice > 0, 
            isFallback: true,
            status: "DB 폴백"
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
    console.error("[Stock API] Severe Master Error:", error.message);
    return NextResponse.json({ error: "데이터 업데이트 중 중대한 오류가 발생했습니다." }, { status: 500 });
  }
}
