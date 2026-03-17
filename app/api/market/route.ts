import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

// 봇 차단 방지를 위한 일반적인 모바일 브라우저 헤더
const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

/**
 * 네이버 모바일 API 데이터 파싱 헬퍼 (콤마 제거 및 Number 변환 완벽 구현)
 */
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // 콤마 제거 후 숫자로 변환
  const cleaned = val.toString().replace(/,/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * 네이버 모바일 API 지수 데이터 조회
 */
async function fetchIndexData(type: 'KOSPI' | 'KOSDAQ') {
  try {
    const res = await fetch(`https://m.stock.naver.com/api/index/${type}/basic`, {
      headers: NAVER_HEADERS,
      next: { revalidate: 0 }
    });
    const data = await res.json();
    return {
      name: type === 'KOSPI' ? '코스피' : '코스닥',
      value: data.closePrice || '0',
      change: data.compareToPreviousClosePrice || '0',
      changeRate: data.fluctuationsRatio || '0.00',
      status: parseFloat(data.fluctuationsRatio || '0') > 0 ? 'UP' : (parseFloat(data.fluctuationsRatio || '0') < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Naver Index Error (${type}):`, e);
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME' };
  }
}

/**
 * 네이버 모바일 API 개별 종목 동적 시세 조회 (tickers 파라미터 대응)
 */
async function fetchStockDetail(ticker: string) {
  try {
    // 백틱을 사용한 동적 URL 할당
    const url = `https://m.stock.naver.com/api/stock/${ticker}/basic`;
    const res = await fetch(url, {
      headers: NAVER_HEADERS,
      next: { revalidate: 0 }
    });
    const data = await res.json();
    
    // 데이터 추출 및 숫자 타입 강제 변환
    return {
      ticker: ticker,
      price: cleanNumber(data.closePrice),
      changeRate: Number(data.fluctuationsRatio || 0),
      volume: cleanNumber(data.accumulatedTradingVolume),
      status: Number(data.fluctuationsRatio) > 0 ? 'UP' : (Number(data.fluctuationsRatio) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Naver Detail Error (${ticker}):`, e);
    return { ticker, price: 0, changeRate: 0, volume: 0, status: 'SAME' };
  }
}

/**
 * 네이버 모바일 API 랭킹 리스트 조회 (홈 화면용)
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
    const res = await fetch(url, { headers: NAVER_HEADERS, next: { revalidate: 0 } });
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
    console.error(`Naver Ranking Error (${type}):`, e);
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

  // 1. 지수 데이터 상세 조회
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

  // 3. 다중 종목 실시간 시세 조회 (tickers=005930,000660...)
  if (tickersParam) {
    // 쉼표로 분리하여 배열 생성
    const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
    // Promise.all을 이용한 비동기 순회 호출
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
