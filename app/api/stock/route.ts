import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 캐싱 무효화
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "올바른 종목 코드 형식이 아닙니다." }, { status: 400 });
    }

    // 1. 티커 정규화 (숫자 6자리인 경우 .KS 추가)
    const normalizedSymbols = symbols.map(s => {
      let symbol = s.toUpperCase().trim();
      if (/^\d{6}$/.test(symbol)) return `\${symbol}.KS`;
      return symbol;
    });

    const results = await Promise.all(
      normalizedSymbols.map(async (symbol) => {
        try {
          // 2. 야후 파이낸스 호출 시도
          const quote: any = await yahooFinance.quote(symbol);
          
          if (quote && quote.regularMarketPrice) {
            const price = quote.regularMarketPrice;
            
            // 3. 성공 시: DB 업데이트 (백그라운드 처리 권장되나 로직상 수동 처리)
            // 종목 코드에서 .KS 등을 떼지 않고 그대로 저장 (또는 원본 매칭을 위해 원본 symbol 사용)
            // 여기서는 원본 symbol 매칭을 위해 symbol 그대로 업데이트 시도
            await Promise.all([
              supabase.from('holdings').update({ 
                last_price: price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', symbol),
              supabase.from('alerts').update({ 
                last_price: price, 
                price_updated_at: new Date().toISOString() 
              }).eq('symbol', symbol)
            ]);

            return {
              symbol,
              price,
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume || 0,
              avgVolume: quote.averageDailyVolume3Month || 0,
              success: true,
              isFallback: false
            };
          }
          throw new Error("No data from Yahoo");
        } catch (e) {
          console.error(`[Stock API] Error fetching \${symbol}, attempting fallback:`, e);
          
          // 4. 실패 시: DB에서 마지막 가격 로드
          const { data: holdingData } = await supabase.from('holdings').select('last_price').eq('symbol', symbol).single();
          const { data: alertData } = await supabase.from('alerts').select('last_price').eq('symbol', symbol).single();
          
          const fallbackPrice = holdingData?.last_price || alertData?.last_price || 0;

          return { 
            symbol, 
            price: fallbackPrice, 
            changePercent: 0, 
            success: fallbackPrice > 0, 
            isFallback: true,
            fetchError: true 
          };
        }
      })
    );

    const priceMap = results.reduce((acc: any, curr) => {
      acc[curr.symbol] = curr;
      return acc;
    }, {});

    return NextResponse.json(priceMap);
  } catch (error) {
    console.error("[Stock API] Global Error:", error);
    return NextResponse.json({ error: "데이터를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
