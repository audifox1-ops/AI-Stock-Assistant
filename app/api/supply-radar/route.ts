import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NAVER_FRONT_API = 'https://m.stock.naver.com/front-api';

interface DetectedSupply {
  ticker: string;
  name: string;
  type: '외국인' | '기관';
  rank: number;
  netBuyValue: string;
}

async function fetchRanking(investorType: 'foreigner' | 'organization') {
  const apiUrl = `${NAVER_FRONT_API}/market/tradingTrend/ranking?periodType=daily&investorType=${investorType}&tradingType=trendBuy&stockExchangeType=KRX`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
      'Referer': 'https://m.stock.naver.com/'
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.result?.stocks || [];
}

export async function POST(req: Request) {
  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json({ success: false, error: "관심종목 데이터가 없습니다." }, { status: 400 });
    }

    // 외인/기관 순매수 상위 데이터 동시 페칭
    const [foreignStocks, organStocks] = await Promise.all([
      fetchRanking('foreigner'),
      fetchRanking('organization')
    ]);

    const detected: DetectedSupply[] = [];

    // 외인 수급 매칭
    foreignStocks.forEach((s: any) => {
      if (tickers.includes(s.itemCode)) {
        detected.push({
          ticker: s.itemCode,
          name: s.stockName || s.itemName,
          type: '외국인',
          rank: s.ranking,
          netBuyValue: s.accumulatedTradingValueKrwHangeul
        });
      }
    });

    // 기관 수급 매칭
    organStocks.forEach((s: any) => {
      if (tickers.includes(s.itemCode)) {
        detected.push({
          ticker: s.itemCode,
          name: s.stockName || s.itemName,
          type: '기관',
          rank: s.ranking,
          netBuyValue: s.accumulatedTradingValueKrwHangeul
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: detected,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Supply Radar API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
