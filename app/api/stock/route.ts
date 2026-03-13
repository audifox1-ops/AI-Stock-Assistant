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
 * 공공데이터포털 주식 시세 정보 (2단계 검색 + 인증 고도화 리팩토링)
 */
async function getPublicStockData(tickerOrName: string) {
  const rawKey = process.env.PUBLIC_DATA_PORTAL_KEY;
  if (!rawKey || rawKey.includes('YOUR_PUBLIC')) return null;

  try {
    // 1. 인증키 정규화 (이중 인코딩 방지)
    const serviceKey = decodeURIComponent(rawKey);
    const baseUrl = "http://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
    
    // 티커 여부 판별 (숫자 6자리 혹은 A+숫자 6자리)
    const cleanTicker = tickerOrName.trim();
    const isNumericTicker = /^\d{6}$/.test(cleanTicker);
    const isATicker = /^A\d{6}$/i.test(cleanTicker);

    // 검색 파라미터 구성 로직
    const searchParams = [];
    
    if (isNumericTicker || isATicker) {
      // 6자리 숫자면 'A'를 앞에 붙여서 srtnCd로 먼저 시도
      const srtnCd = isNumericTicker ? `A\${cleanTicker}` : cleanTicker.toUpperCase();
      searchParams.push(`srtnCd=\${srtnCd}`);
      // 종목명으로도 백업 시도할 수 있게 명칭도 추가 (실제로는 srtnCd로 먼저 호출)
      searchParams.push(`itmsNm=\${encodeURIComponent(cleanTicker)}`);
    } else {
      // 숫자가 아니면 종목명으로 판단
      searchParams.push(`itmsNm=\${encodeURIComponent(cleanTicker)}`);
    }

    // --- 2단계 검색 로직 시작 ---
    for (const param of searchParams) {
      const fullUrl = `\${baseUrl}?serviceKey=\${serviceKey}&resultType=json&numOfRows=1&\${param}`;
      
      console.log(`[Stock API] Requesting: \${maskUrl(fullUrl)}`);

      const res = await fetch(fullUrl, { cache: 'no-store' });
      const text = await res.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error(`[Stock API] JSON Parse Error (\${tickerOrName}): \${text.substring(0, 200)}`);
        continue; // 다음 파라미터로 시도
      }

      const header = data?.response?.header;
      if (header?.resultCode !== "00") {
        console.error(`[Stock API] FAIL (\${tickerOrName}) - Code: \${header?.resultCode}, Msg: \${header?.resultMsg}`);
        continue;
      }

      const item = data?.response?.body?.items?.item?.[0];

      if (item) {
        console.log(`[Stock API] SUCCESS (\${tickerOrName}) via \${param.split('=')[0]}: \${item.clpr}`);
        return {
          price: parseFloat(item.clpr),
          change: parseFloat(item.vs),
          changePercent: parseFloat(item.fltRt),
          success: true,
          status: "공공데이터"
        };
      }
    }
    // 모든 시도 실패 시
  } catch (e: any) {
    console.error(`[Stock API] ERROR (\${tickerOrName}):`, e.message);
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

    console.log(`[Stock API] Updating \${symbols.length} symbols...`);

    const results = await Promise.all(
      symbols.map(async (s) => {
        let originalSymbol = s.toUpperCase().trim();
        
        try {
          // 1. 공공데이터 우선
          let data = await getPublicStockData(originalSymbol);
          
          // 2. 실패 시 야후
          if (!data) {
            console.log(`[Stock API] Primary Search Failed for \${originalSymbol} -> Trying Yahoo...`);
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
          console.error(`[Stock API] Critical Fallback Process for \${originalSymbol}: \${e.message}`);
          
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
    console.error("[Stock API] Severe POST Error:", error.message);
    return NextResponse.json({ error: "데이터 업데이트 중 중대한 오류가 발생했습니다." }, { status: 500 });
  }
}
