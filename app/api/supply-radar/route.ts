import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 허용된 도메인 리스트
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

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
  // CORS 검증
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json({ success: false, error: "관심종목 데이터가 없습니다." }, { status: 400 });
    }

    const [foreignStocks, organStocks] = await Promise.all([
      fetchRanking('foreigner'),
      fetchRanking('organization')
    ]);

    const detected: DetectedSupply[] = [];

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

    return NextResponse.json(
      {
        success: true,
        data: detected,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      }
    );

  } catch (error: any) {
    console.error('Supply Radar API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
