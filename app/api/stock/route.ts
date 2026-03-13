import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

/**
 * 티커에 대해 .KS와 .KQ를 순차적으로 시도하여 유효한 데이터를 가져옵니다.
 */
async function getQuoteWithRetry(symbol: string) {
  const baseSymbol = symbol.split('.')[0];
  
  // 1. .KS 시도 (한국 거래소 우선)
  try {
    const ksSymbol = `\${baseSymbol}.KS`;
    const quote = (await yahooFinance.quote(ksSymbol)) as any;
    if (quote && quote.regularMarketPrice) {
      return { quote, finalSymbol: ksSymbol };
    }
  } catch (e) {
    console.error(`[Stock API] .KS failed for \${baseSymbol}, trying .KQ...`);
  }

  // 2. .KQ 시도 (코스닥 재시도)
  try {
    const kqSymbol = `\${baseSymbol}.KQ`;
    const quote = (await yahooFinance.quote(kqSymbol)) as any;
    if (quote && quote.regularMarketPrice) {
      return { quote, finalSymbol: kqSymbol };
    }
  } catch (e) {
    console.error(`[Stock API] .KQ also failed for \${baseSymbol}`);
  }

  // 3. 둘 다 실패 시 null 반환
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
        let isNumericTicker = /^\d{6}$/.test(originalSymbol);

        try {
          let data: any = null;

          if (isNumericTicker) {
            // 숫자로 된 티커인 경우 순차적 재시도 로직 가동
            data = await getQuoteWithRetry(originalSymbol);
          } else {
            // 이미 .KS 등이 붙어 있거나 외인 주식인 경우 직접 요청
            const quote = (await yahooFinance.quote(originalSymbol)) as any;
            if (quote && quote.regularMarketPrice) data = { quote, finalSymbol: originalSymbol };
          }

          if (data && data.quote.regularMarketPrice) {
            const price = data.quote.regularMarketPrice;
            const finalSymbol = data.finalSymbol;
            
            // 성공 시에만 DB 업데이트
            await Promise.all([
              supabase.from('holdings').update({ 
                last_price: price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol),
              supabase.from('alerts').update({ 
                last_price: price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', originalSymbol)
            ]);

            return {
              symbol: originalSymbol,
              price,
              changePercent: data.quote.regularMarketChangePercent || 0,
              success: true,
              isFallback: false
            };
          }
          throw new Error("No real-time data found");
        } catch (e: any) {
          console.error(`[Stock API] Error fetching \${originalSymbol}: \${e.message}`);
          
          // 호출 실패 시 DB에서 마지막 가격 무조건 반환 (0 방지)
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
