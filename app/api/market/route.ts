import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

/**
 * 네이버 API 데이터 파싱 헬퍼 (엄격한 숫자 정제)
 */
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === '-' || val === '') return 0;
  const cleaned = val.toString().replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * 네이버 Polling API 지수 데이터 조회
 */
async function fetchIndexData(type: 'KOSPI' | 'KOSDAQ') {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:${type}`;
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
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
    console.error(`Index Polling Error (${type}):`, e);
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME' };
  }
}

/**
 * 네이버 Polling API 개별 종목 시세 조회
 */
async function fetchStockDetail(ticker: string) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${ticker}`;
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const data = await res.json();
    const item = data?.result?.areas?.[0]?.datas?.[0];

    return {
      ticker: ticker.trim(),
      price: item?.nv ? Number(item.nv) : 0,
      changeRate: item?.cr ? Number(item.cr) : 0,
      volume: item?.aq ? Number(item.aq) : 0,
      status: Number(item?.cr || 0) > 0 ? 'UP' : (Number(item?.cr || 0) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Stock Polling Error (${ticker}):`, e);
    return { ticker: ticker.trim(), price: 0, changeRate: 0, volume: 0, status: 'SAME' };
  }
}

/**
 * 네이버 Integration API 종목 상세 정보 조회 (0원 표시 해결 필드 매핑)
 */
async function fetchStockIntegration(ticker: string) {
  try {
    const url = `https://m.stock.naver.com/api/stock/${ticker}/integration`;
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const data = await res.json();
    
    // 네이버 Integration API는 다양한 위치에 데이터를 배치함
    const totalInfo = data?.totalInfos?.[0] || {};
    const stockItem = data?.stockItem || {};
    
    // 시가총액은 수치형으로 가져와서 억원 단위로 변환 (value / 100,000,000)
    const rawMarketCap = cleanNumber(totalInfo.marketCap || data.marketCap || stockItem.marketCap);
    const convertedMarketCap = Math.floor(rawMarketCap / 100000000);

    return {
      ticker: ticker,
      stockName: totalInfo.stockName || data.stockName || stockItem.stockName || '',
      price: cleanNumber(totalInfo.closePrice || data.closePrice || stockItem.closePrice || data.now),
      changeRate: totalInfo.fluctuationsRatio || data.fluctuationsRatio || stockItem.fluctuationsRatio || '0.00',
      
      // 상세 투자 지표 (정확한 필드 매핑)
      high52w: cleanNumber(totalInfo.high52w || totalInfo.high52Weeks || data.high52Weeks || stockItem.high52Weeks),
      low52w: cleanNumber(totalInfo.low52w || totalInfo.low52Weeks || data.low52Weeks || stockItem.low52Weeks),
      targetPrice: cleanNumber(totalInfo.targetPrice || data.targetPrice || stockItem.targetPrice),
      marketCap: convertedMarketCap, // 억원 단위로 프론트엔드 전달
      per: cleanNumber(totalInfo.per || data.per || stockItem.per),
      pbr: cleanNumber(totalInfo.pbr || data.pbr || stockItem.pbr),
      eps: cleanNumber(totalInfo.eps || data.eps || stockItem.eps),
      bps: cleanNumber(totalInfo.bps || data.bps || stockItem.bps),
      dividendYield: totalInfo.dividendYield || data.dividendYield || stockItem.dividendYield || '0.00',
      industryName: totalInfo.industryName || data.itemType || stockItem.industryName || ''
    };
  } catch (e) {
    console.error(`Stock Integration Error (${ticker}):`, e);
    return null;
  }
}

/**
 * 네이버 종목 검색 API
 */
async function fetchStockSearch(query: string) {
  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`;
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const data = await res.json();
    const items = data?.items?.[0] || [];
    return items.map((item: any) => ({
      name: item[0][0],
      code: item[0][1]
    }));
  } catch (e) {
    console.error(`Search Error (${query}):`, e);
    return [];
  }
}

/**
 * 네이버 모바일 API 랭킹 리스트 조회 (랭킹 로직 완전 복구)
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
    // Vercel 배포 환경에서는 origin 검사를 유연하게 함
    // return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const tickersParam = searchParams.get('tickers');
  const ticker = searchParams.get('ticker');
  const query = searchParams.get('q');

  // 1. 지수 데이터
  if (type === 'index') {
    const indices = await Promise.all([fetchIndexData('KOSPI'), fetchIndexData('KOSDAQ')]);
    return NextResponse.json({ success: true, data: indices });
  }

  // 2. 종목 상세 지표 (Integration)
  if (type === 'detail' && ticker) {
    const detail = await fetchStockIntegration(ticker);
    return NextResponse.json({ success: true, data: detail });
  }

  // 3. 종목 검색
  if (query) {
    const results = await fetchStockSearch(query);
    return NextResponse.json({ success: true, data: results });
  }

  // 4. 홈 화면 랭킹 리스트
  if (type && !tickersParam && !ticker) {
    const ranks = await fetchRankingList(type);
    return NextResponse.json({ success: true, data: ranks });
  }

  // 5. 다중 종목 실시간 시세 (Polling)
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
