import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

/**
 * 429 차단 우회를 위한 동적 User-Agent 풀
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

const getHeaders = () => ({
  'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://m.stock.naver.com'
});

/**
 * 네이버 API 데이터 파싱 헬퍼 (단위 및 특수문자 정밀 정제)
 */
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === '-' || val === '') return 0;
  
  let str = val.toString().replace(/,/g, '');
  
  // 한국어 단위 처리 (조, 억, 배, % 등 제거)
  if (str.includes('조')) {
    const parts = str.split('조');
    const jo = parseFloat(parts[0] || '0');
    const eok = parts[1] ? parseFloat(parts[1].replace(/억/g, '') || '0') : 0;
    return (jo * 10000) + eok; 
  }
  
  // 단순 숫자 추출
  const match = str.match(/[-?0-9.]+/);
  if (match) {
    return parseFloat(match[0]);
  }
  
  return 0;
};

/**
 * 네이버 Polling API 지수 데이터 조회
 * [api-architect] 지수 데이터 100배 뻥튀기 버그 해결:
 * - 네이버 Polling API는 지수(nv) 및 등락(cv) 수치에 100을 곱해서 반환하므로,
 * - 반드시 100으로 나눈 뒤 소수점 둘째 자리까지 고정(toFixed(2))하여 반환합니다.
 */
async function fetchIndexData(type: 'KOSPI' | 'KOSDAQ') {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:${type}`;
    const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 0 } });
    
    if (res.status === 429) throw new Error('RATE_LIMIT');

    const data = await res.json();
    const item = data?.result?.areas?.[0]?.datas?.[0];

    // 지수 값(nv) 및 등락 값(cv)을 100으로 나누어 정규화
    const normalizedValue = item?.nv ? (Number(item.nv) / 100).toFixed(2) : '0.00';
    const normalizedChange = item?.cv ? (Number(item.cv) / 100).toFixed(2) : '0.00';

    return {
      name: type === 'KOSPI' ? '코스피' : '코스닥',
      value: normalizedValue,
      change: normalizedChange,
      changeRate: item?.cr ? item.cr.toString() : '0.00',
      status: Number(item?.cr || 0) > 0 ? 'UP' : (Number(item?.cr || 0) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e: any) {
    console.error(`Index Polling Error (${type}):`, e.message);
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME', error: e.message === 'RATE_LIMIT' ? '429' : null };
  }
}

/**
 * 네이버 Polling API 개별 종목 시세 조회 (실시간용)
 */
async function fetchStockDetail(ticker: string) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${ticker}`;
    const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 0 } });
    
    if (res.status === 429) throw new Error('RATE_LIMIT');

    const data = await res.json();
    const item = data?.result?.areas?.[0]?.datas?.[0];

    return {
      ticker: ticker.trim(),
      price: item?.nv ? Number(item.nv) : 0,
      changeRate: item?.cr ? Number(item.cr) : 0,
      volume: item?.aq ? Number(item.aq) : 0,
      status: Number(item?.cr || 0) > 0 ? 'UP' : (Number(item?.cr || 0) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e: any) {
    console.error(`Stock Polling Error (${ticker}):`, e.message);
    return { ticker: ticker.trim(), price: 0, changeRate: 0, volume: 0, status: 'SAME', error: e.message === 'RATE_LIMIT' ? '429' : null };
  }
}

/**
 * 네이버 Integration API 종목 상세 정보 조회
 */
async function fetchStockIntegration(ticker: string) {
  try {
    const url = `https://m.stock.naver.com/api/stock/${ticker}/integration`;
    const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 0 } });
    
    if (res.status === 429) throw new Error('RATE_LIMIT');

    const data = await res.json();
    
    const totalInfos = data?.totalInfos || [];
    const dealTrendInfo = data?.dealTrendInfos?.[0] || {};
    const consensusInfo = data?.consensusInfo || {};

    const findVal = (code: string) => {
      const found = totalInfos.find((info: any) => info.code === code);
      return found ? found.value : null;
    };

    const currentPrice = cleanNumber(dealTrendInfo.closePrice || data.closePrice || data.now);
    const marketCap = cleanNumber(findVal('marketValue'));
    
    return {
      ticker: ticker,
      stockName: data.stockName || data.itemName || '',
      price: currentPrice,
      changeRate: data.fluctuationsRatio || dealTrendInfo.fluctuationsRatio || '0.00',
      high52w: cleanNumber(findVal('highPriceOf52Weeks')),
      low52w: cleanNumber(findVal('lowPriceOf52Weeks')),
      targetPrice: cleanNumber(consensusInfo.priceTargetMean),
      marketCap: marketCap, 
      per: cleanNumber(findVal('per')),
      pbr: cleanNumber(findVal('pbr')),
      eps: cleanNumber(findVal('eps')),
      bps: cleanNumber(findVal('bps')),
      dividendYield: findVal('dividendYield') || '0.00',
      industryName: data.itemType || ''
    };
  } catch (e: any) {
    console.error(`Integration Error (${ticker}):`, e.message);
    return null;
  }
}

/**
 * 네이버 모바일 API 랭킹 리스트 조회 (홈 화면 복구)
 */
async function fetchRankingList(type: string) {
  let url = '';
  let dataPath = 'stocks'; 
  let itemNameKey = 'stockName';

  switch (type) {
    case 'kospi_market_cap':
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=30';
      break;
    case 'kosdaq_market_cap':
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSDAQ?page=1&pageSize=30';
      break;
    case 'volume':
      url = 'https://m.stock.naver.com/front-api/market/realTimeTop?nationType=domestic&sortType=quantTop';
      dataPath = 'result.stocks';
      itemNameKey = 'itemName';
      break;
    case 'foreign_buy':
      url = 'https://m.stock.naver.com/front-api/market/tradingTrend/ranking?periodType=daily&investorType=foreigner&tradingType=trendBuy';
      dataPath = 'result.stocks';
      itemNameKey = 'itemName';
      break;
    case 'institution_buy':
      url = 'https://m.stock.naver.com/front-api/market/tradingTrend/ranking?periodType=daily&investorType=organization&tradingType=trendBuy';
      dataPath = 'result.stocks';
      itemNameKey = 'itemName';
      break;
    default:
      url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=30';
  }

  try {
    const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 0 } });
    if (res.status === 429) throw new Error('RATE_LIMIT');

    const json = await res.json();
    
    let stocks = [];
    if (dataPath === 'stocks') {
      stocks = json.stocks || [];
    } else if (dataPath === 'result.stocks') {
      stocks = json.result?.stocks || [];
    }

    return stocks.map((s: any) => ({
      itemCode: s.itemCode || s.code,
      stockName: s[itemNameKey] || s.stockName || s.itemName || '',
      closePrice: cleanNumber(s.closePrice || s.now),
      fluctuationsRatio: s.fluctuationsRatio || '0.00',
      volume: cleanNumber(s.accumulatedTradingVolume || s.volume),
      fluctuationType: s.fluctuationType || 'STABLE'
    }));
  } catch (e: any) {
    console.error(`Ranking Fetch Error (${type}):`, e.message);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const tickersParam = searchParams.get('tickers');
  const ticker = searchParams.get('ticker');
  const query = searchParams.get('q');

  try {
    // 1. 지수 데이터
    if (type === 'index') {
      const indices = await Promise.all([fetchIndexData('KOSPI'), fetchIndexData('KOSDAQ')]);
      const hasLimit = indices.some((i: any) => i.error === '429');
      return NextResponse.json({ success: !hasLimit, data: indices, error: hasLimit ? 'RATE_LIMIT' : null });
    }

    // 2. 종목 상세 지표
    if (type === 'detail' && ticker) {
      const detail = await fetchStockIntegration(ticker);
      return NextResponse.json({ success: !!detail, data: detail });
    }

    // 3. 종목 검색 (네이버 자동완성 API 연동)
    // [api-architect] 검색 엔진 개편:
    // - 네이버 자동완성 API를 q 파라미터로 호출하여 실시간 종목 리스트를 반환합니다.
    // - 프론트엔드 대응을 위해 [{ code, name }, ...] 구조로 정규화합니다.
    if (query) {
      const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`;
      const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 0 } });
      if (res.status === 429) return NextResponse.json({ success: false, error: 'RATE_LIMIT' });
      
      const data = await res.json();
      const items = data?.items?.[0] || [];
      const results = items.map((item: any) => ({
        name: item[0][0], // 종목명
        code: item[0][1]  // 종목코드
      }));
      return NextResponse.json({ success: true, data: results });
    }

    // 4. 랭킹 리스트 (홈 화면 데이터)
    if (type && !tickersParam && !ticker) {
      const ranks = await fetchRankingList(type);
      return NextResponse.json({ success: ranks.length > 0, data: ranks, error: ranks.length === 0 ? 'EMPTY_OR_LIMIT' : null });
    }

    // 5. 다중 종목 실시간 시세 (관심종목용)
    if (tickersParam) {
      const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
      const details = await Promise.all(tickers.map(t => fetchStockDetail(t.trim())));
      const hasLimit = details.some((d: any) => d.error === '429');
      return NextResponse.json({ success: !hasLimit, data: details, error: hasLimit ? 'RATE_LIMIT' : null });
    }

    return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Critical API Route Error:', err);
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
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
