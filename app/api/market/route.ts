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
 * 네이버 모바일 API 데이터 파싱 헬퍼 (콤마 제거 및 숫자 변환)
 */
const parseNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
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
    console.error(`Naver Index Fetch Error (${type}):`, e);
    return { name: type === 'KOSPI' ? '코스피' : '코스닥', value: '-', change: '0', changeRate: '0.00', status: 'SAME' };
  }
}

/**
 * 네이버 모바일 API 개별 종목 시세 조회 (basic 엔드포인트로 변경하여 안정성 확보)
 */
async function fetchStockDetail(ticker: string) {
  try {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${ticker}/basic`, {
      headers: NAVER_HEADERS,
      next: { revalidate: 0 }
    });
    const data = await res.json();
    
    // basic 응답 구조에 맞게 직접 매핑
    return {
      ticker: ticker,
      price: parseNumber(data.closePrice || '0'),
      changeRate: parseFloat(data.fluctuationsRatio || '0.00'),
      volume: parseNumber(data.accumulatedTradingVolume || '0'),
      status: parseFloat(data.fluctuationsRatio || '0') > 0 ? 'UP' : (parseFloat(data.fluctuationsRatio || '0') < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`Naver Stock Fetch Error (${ticker}):`, e);
    // 에러 시 0을 반환하여 프론트엔드에서 방어 로직이 작동하도록 함
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

  // 1. 지수 데이터 상세 조회
  if (type === 'index') {
    const indices = await Promise.all([
      fetchIndexData('KOSPI'),
      fetchIndexData('KOSDAQ')
    ]);
    return NextResponse.json({ success: true, data: indices });
  }

  // 2. 다중 종목 실시간 시세 조회 (관심/보유종목용)
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
