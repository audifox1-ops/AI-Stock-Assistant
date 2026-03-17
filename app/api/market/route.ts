import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

/**
 * 네이버 모바일 API 데이터 파싱 헬퍼
 */
const parseNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return Number(val.toString().replace(/,/g, ''));
};

async function fetchIndexData(type: 'KOSPI' | 'KOSDAQ') {
  try {
    const res = await fetch(`https://m.stock.naver.com/api/index/${type}/basic`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      },
      next: { revalidate: 0 }
    });
    const data = await res.json();
    return {
      name: type === 'KOSPI' ? '코스피' : '코스닥',
      value: data.closePrice || '0',
      change: data.compareToPreviousClosePrice || '0',
      changeRate: data.fluctuationsRatio || '0.00',
      status: parseFloat(data.fluctuationsRatio) > 0 ? 'UP' : (parseFloat(data.fluctuationsRatio) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME' };
  }
}

async function fetchTickerDetail(ticker: string) {
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${ticker}/integration`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      },
      next: { revalidate: 0 }
    });
    const data = await res.json();
    const stock = data.totalInfos?.[0] || {};
    
    // 현재가 및 거래량에서 콤마 제거 후 숫자로 변환
    return {
      ticker: ticker,
      price: parseNumber(stock.currentPrice || stock.closePrice),
      changeRate: parseFloat(stock.fluctuationsRatio || '0.00'),
      volume: parseNumber(stock.accumulatedTradingVolume),
      status: parseFloat(stock.fluctuationsRatio) > 0 ? 'UP' : (parseFloat(stock.fluctuationsRatio) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    return { ticker, price: 0, changeRate: 0, volume: 0, status: 'SAME' };
  }
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const tickersParam = searchParams.get('tickers');
  const category = decodeURIComponent(searchParams.get('category') || '');

  // 1. 지수 데이터 상세 조회
  if (type === 'index') {
    const indices = await Promise.all([
      fetchIndexData('KOSPI'),
      fetchIndexData('KOSDAQ')
    ]);
    return NextResponse.json({ success: true, data: indices });
  }

  // 2. 다중 종목 실시간 시세 병합 전용 로직
  if (tickersParam) {
    const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
    const details = await Promise.all(tickers.map(t => fetchTickerDetail(t.trim())));
    return NextResponse.json({ success: true, data: details });
  }

  // 3. 랭킹 리스트 조회
  if (category) {
    let listUrl = '';
    const NAVER_FRONT_API = 'https://m.stock.naver.com/front-api';
    
    switch (category) {
      case 'KOSPI 시총상위':
        listUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
        break;
      case 'KOSDAQ 시총상위':
        listUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSDAQ&pageSize=30&domesticStockExchangeType=KRX&page=1`;
        break;
      case '거래량상위':
        listUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=quantTop&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
        break;
      default:
        listUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
    }

    try {
      const response = await fetch(listUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        },
        next: { revalidate: 0 }
      });
      const data = await response.json();
      const rawStocks = data.result?.stocks || [];
      const normalized = rawStocks.map((s: any) => ({
        itemCode: s.itemCode || s.code,
        stockName: s.stockName || s.name,
        closePrice: parseNumber(s.closePrice),
        fluctuationsRatio: s.fluctuationsRatio || '0.00',
        volume: parseNumber(s.accumulatedTradingVolume),
        fluctuationType: s.compareToPreviousPrice?.name || 'STABLE'
      }));
      return NextResponse.json({ success: true, data: normalized });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
