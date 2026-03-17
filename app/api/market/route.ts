import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

/**
 * 네이버 모바일 API 엔드포인트
 * 지수: https://m.stock.naver.com/api/index/KOSPI/basic
 * 종목상세: https://m.stock.naver.com/api/stock/${ticker}/integration
 */

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
    // totalInfos[0] 또는 관련 필드에서 데이터 추출 (네이버 API 구조에 따름)
    const stock = data.totalInfos?.[0] || {};
    return {
      ticker: ticker,
      price: stock.currentPrice || stock.closePrice || 0,
      changeRate: stock.fluctuationsRatio || '0.00',
      volume: stock.accumulatedTradingVolume || 0,
      status: parseFloat(stock.fluctuationsRatio) > 0 ? 'UP' : (parseFloat(stock.fluctuationsRatio) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    return { ticker, price: 0, changeRate: '0.00', volume: 0, status: 'SAME' };
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

  // 1. 지수 데이터 조회 전용 로직
  if (type === 'index') {
    const indices = await Promise.all([
      fetchIndexData('KOSPI'),
      fetchIndexData('KOSDAQ')
    ]);
    return NextResponse.json({ success: true, data: indices });
  }

  // 2. 다중 종목 실시간 시세 조회 로직
  if (tickersParam) {
    const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
    const details = await Promise.all(tickers.map(t => fetchTickerDetail(t)));
    return NextResponse.json({ success: true, data: details });
  }

  // 3. 기존 랭킹 리스트 로직 (필요시 유지)
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
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
          'Referer': 'https://m.stock.naver.com/'
        },
        next: { revalidate: 0 }
      });
      const data = await response.json();
      const rawStocks = data.result?.stocks || [];
      const normalized = rawStocks.map((s: any) => ({
        itemCode: s.itemCode || s.code,
        stockName: s.stockName || s.name,
        closePrice: s.closePrice || '0',
        fluctuationsRatio: s.fluctuationsRatio || '0.00',
        volume: s.accumulatedTradingVolume || '0',
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
