import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

// 브라우저 차단 방지를 위한 일반적인 헤더
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

/**
 * 네이버 Polling API 데이터 파싱 헬퍼
 */
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * 네이버 Polling API 지수 데이터 조회 (SERVICE_INDEX)
 */
async function fetchIndexData(type: 'KOSPI' | 'KOSDAQ') {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:${type}`;
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      next: { revalidate: 0 }
    });
    const data = await res.json();
    const item = data?.result?.areas?.[0]?.datas?.[0];

    return {
      name: type === 'KOSPI' ? '코스피' : '코스닥',
      value: item?.nv ? item.nv.toLocaleString() : '0',
      change: item?.cv ? item.cv.toLocaleString() : '0',
      changeRate: item?.cr ? item.cr.toString() : '0.00',
      status: Number(item?.cr || 0) > 0 ? 'UP' : (Number(item?.cr || 0) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Naver Index Polling Error (${type}):`, e);
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME' };
  }
}

/**
 * 네이버 Polling API 개별 종목 시세 조회 (SERVICE_ITEM)
 */
async function fetchStockDetail(ticker: string) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${ticker}`;
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      next: { revalidate: 0 }
    });
    const data = await res.json();
    const item = data?.result?.areas?.[0]?.datas?.[0];

    return {
      ticker: ticker,
      price: item?.nv ? Number(item.nv) : 0,
      changeRate: item?.cr ? Number(item.cr) : 0,
      volume: item?.aq ? Number(item.aq) : 0,
      status: Number(item?.cr || 0) > 0 ? 'UP' : (Number(item?.cr || 0) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Naver Stock Polling Error (${ticker}):`, e);
    return { ticker, price: 0, changeRate: 0, volume: 0, status: 'SAME' };
  }
}

/**
 * 네이버 모바일 API 랭킹 리스트 조회 (랭킹은 기존 모바일 API 유지 또는 최적화 필요)
 * 랭킹 API는 아직 m.stock... 엔드포인트가 유효할 수 있으나, 차단 시 수동 갱신 로직 필요.
 */
async function fetchRankingList(type: string) {
  let url = '';
  switch (type) {
    case 'kospi_market_cap':
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=30';
      break;
    case 'kosdaq_market_cap':
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSDAQ?page=1&pageSize=30';
      break;
    case 'volume':
      url = 'https://m.stock.naver.com/api/stocks/volume/KOSPI?page=1&pageSize=30';
      break;
    case 'foreign_buy':
      url = 'https://m.stock.naver.com/api/stocks/investorBuy/KOSPI/FOREIGNER?page=1&pageSize=30';
      break;
    case 'institution_buy':
      url = 'https://m.stock.naver.com/api/stocks/investorBuy/KOSPI/INSTITUTION?page=1&pageSize=30';
      break;
    default:
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=30';
  }

  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const data = await res.json();
    const stocks = data.stocks || [];
    
    return stocks.map((s: any) => ({
      itemCode: s.itemCode || s.code,
      stockName: s.stockName || s.name,
      closePrice: cleanNumber(s.closePrice),
      fluctuationsRatio: s.fluctuationsRatio || '0.00',
      volume: cleanNumber(s.accumulatedTradingVolume || s.volume),
      fluctuationType: s.fluctuationType || 'STABLE'
    }));
  } catch (e) {
    console.error(`Ranking Fetch Error (${type}):`, e);
    return [];
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

  // 1. 지수 데이터 조회 (Polling API)
  if (type === 'index') {
    const indices = await Promise.all([
      fetchIndexData('KOSPI'),
      fetchIndexData('KOSDAQ')
    ]);
    return NextResponse.json({ success: true, data: indices });
  }

  // 2. 홈 화면 랭킹 리스트 조회
  if (type && type !== 'index' && !tickersParam) {
    const ranks = await fetchRankingList(type);
    return NextResponse.json({ success: true, data: ranks });
  }

  // 3. 다중 종목 실시간 시세 조회 (Polling API)
  if (tickersParam) {
    const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
    const details = await Promise.all(tickers.map(t => fetchStockDetail(t.trim())));
    return NextResponse.json({ success: true, data: details });
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
