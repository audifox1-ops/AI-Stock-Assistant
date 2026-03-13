import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

const PUBLIC_KEY = process.env.PUBLIC_DATA_PORTAL_KEY;

/**
 * 공공데이터포털에서 주식 시세 정보를 가져옵니다.
 */
async function getPublicStockData(tickerOrName: string) {
  if (!PUBLIC_KEY || PUBLIC_KEY.includes('YOUR_PUBLIC')) return null;

  try {
    // 종목코드(6자리) 또는 종목명으로 검색
    const isCode = /^\d{6}$/.test(tickerOrName);
    const param = isCode ? `likeSrtnCd=\${tickerOrName}` : `itmsNm=\${encodeURIComponent(tickerOrName)}`;
    
    // 금융위원회 주식시세정보 (getStockPriceInfo)
    const url = `http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo?serviceKey=\${PUBLIC_KEY}&resultType=json&numOfRows=1&\${param}`;
    
    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item?.[0];

    if (item) {
      return {
        price: parseFloat(item.clpr), // 종가
        change: parseFloat(item.vs), // 전일대비
        changePercent: parseFloat(item.fltRt), // 등락률
        success: true,
        status: "공공데이터"
      };
    }
  } catch (e) {
    console.error(`[Stock API] Public Data Portal Error for \${tickerOrName}:`, e);
  }
  return null;
}

/**
 * 야후 파이낸스 폴백 로직
 */
async function getYahooFallback(symbol: string) {
  const baseSymbol = symbol.split('.')[0];
  const extensions = ['.KS', '.KQ', '']; // 코스피, 코스닥 순차 시도

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
          throw new Error("No data found from any source");
        } catch (e: any) {
          console.error(`[Stock API] Error fetching \${originalSymbol}: \${e.message}`);
          
          // 호출 실패 시 DB에서 마지막 가격 반환
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
    console.error("[Stock API] Global Error:", error.message);
    return NextResponse.json({ error: "데이터를 불러오는 데 실패했습니다." }, { status: 500 });
  }
}
