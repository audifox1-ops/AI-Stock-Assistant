import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

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
    return (jo * 10000) + eok; // 억 단위로 변환 반환 (시총용)
  }
  
  // 단순 숫자 추출 (배, %, 억 등 제거)
  const match = str.match(/[-?0-9.]+/);
  if (match) {
    return parseFloat(match[0]);
  }
  
  return 0;
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
 * 네이버 Polling API 개별 종목 시세 조회 (실시간용)
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
 * 네이버 Integration API 종목 상세 정보 조회 (배열 순회 방식으로 필드 매핑 보완)
 */
async function fetchStockIntegration(ticker: string) {
  try {
    const url = `https://m.stock.naver.com/api/stock/${ticker}/integration`;
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const data = await res.json();
    
    const totalInfos = data?.totalInfos || [];
    const dealTrendInfo = data?.dealTrendInfos?.[0] || {};
    const consensusInfo = data?.consensusInfo || {};

    const findVal = (code: string) => {
      const found = totalInfos.find((info: any) => info.code === code);
      return found ? found.value : null;
    };

    // 현재가 (dealTrendInfos[0].closePrice가 가장 정확)
    const currentPrice = cleanNumber(dealTrendInfo.closePrice || data.closePrice || data.now);
    
    // 시가총액 (totalInfos 배열 내 marketValue) - 억 단위로 변환됨 (cleanNumber 조/억 처리 로직에 의해)
    const marketCap = cleanNumber(findVal('marketValue'));
    
    // 수치 매핑
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
  } catch (e) {
    console.error(`Integration Error (${ticker}):`, e);
    return null;
  }
}

/**
 * 네이버 모바일 API 랭킹 리스트 조회 (구조적 계층 및 필드명 보정)
 */
async function fetchRankingList(type: string) {
  let url = '';
  let dataPath = 'stocks'; // 기본
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
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const json = await res.json();
    
    // 데이터 경로 접근
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
  } catch (e) {
    console.error(`Ranking Fetch Error (${type}):`, e);
    return [];
  }
}

export async function GET(request: Request) {
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

  // 2. 종목 상세 지표
  if (type === 'detail' && ticker) {
    const detail = await fetchStockIntegration(ticker);
    return NextResponse.json({ success: true, data: detail });
  }

  // 3. 종목 검색
  if (query) {
    try {
      const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`;
      const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
      const data = await res.json();
      const items = data?.items?.[0] || [];
      const results = items.map((item: any) => ({
        name: item[0][0],
        code: item[0][1]
      }));
      return NextResponse.json({ success: true, data: results });
    } catch (e) {
      return NextResponse.json({ success: false, data: [] });
    }
  }

  // 4. 랭킹 리스트
  if (type && !tickersParam && !ticker) {
    const ranks = await fetchRankingList(type);
    return NextResponse.json({ success: true, data: ranks });
  }

  // 5. 다중 종목 실시간 시세
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
