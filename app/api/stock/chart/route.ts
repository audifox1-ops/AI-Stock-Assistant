import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * [api-architect] 역할:
 * - 외부 API 연동 시 429 차단을 방지하기 위해 캐싱 레이어를 구축합니다.
 * - 데이터 파싱 시 NaN, undefined가 발생하지 않도록 엄격하게 정제합니다.
 * - 에러 발생 시 서버가 죽지 않게 구조화된 Fallback 응답을 반환합니다.
 */

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

/**
 * [api-architect] Strict Data Parsing:
 * - 문자열 및 숫자를 안전하게 Number로 변환하고 콤마(,) 등 노이즈를 제거합니다.
 */
function safeNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  const num = Number(String(val).replace(/,/g, ''));
  return isNaN(num) ? fallback : num;
}

/**
 * 네이버 날짜 문자열(YYYYMMDDHHMMSS)을 UNIX Timestamp(seconds)로 변환
 */
function convertToUnix(dateStr: string): number {
  if (!dateStr || dateStr.length < 12) return 0;
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(8, 10));
  const min = parseInt(dateStr.substring(10, 12));
  const sec = dateStr.length >= 14 ? parseInt(dateStr.substring(12, 14)) : 0;

  const date = new Date(year, month, day, hour, min, sec);
  return Math.floor(date.getTime() / 1000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const timeframe = searchParams.get('timeframe') || 'day';

  if (!ticker) {
    return NextResponse.json({ 
      success: false, 
      data: null, 
      error: 'Ticker is required' 
    }, { status: 400 });
  }

  let url = '';
  let isMinute = false;

  switch (timeframe) {
    case '1m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute?interval=1`;
      isMinute = true;
      break;
    case '3m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute?interval=3`;
      isMinute = true;
      break;
    case '5m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute?interval=5`;
      isMinute = true;
      break;
    case 'day':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}?periodType=dayCandle`;
      break;
    case 'week':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}?periodType=weekCandle`;
      break;
    case 'month':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}?periodType=monthCandle`;
      break;
    default:
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}?periodType=dayCandle`;
  }

  try {
    /**
     * [api-architect] Rate Limiting & Caching:
     * - next: { revalidate: 60 } 옵션을 통해 1분간 캐싱하여 중복 요청에 의한 429 차단을 방어합니다.
     */
    const res = await fetch(url, { 
      headers: REQUEST_HEADERS, 
      next: { revalidate: 60 } 
    });

    if (!res.ok) {
      throw new Error(`External API Error: ${res.status}`);
    }

    const json = await res.json();
    
    let rawData: any[] = [];
    if (Array.isArray(json)) {
      rawData = json;
    } else if (json && json.priceInfos && Array.isArray(json.priceInfos)) {
      rawData = json.priceInfos;
    }

    const formattedData = rawData.map((item: any) => {
      const dateStr = item.localDateTime || item.localDate || item.startTime;
      const time = convertToUnix(dateStr);
      
      /**
       * [chart-master] 요구 규격: 
       * - 분봉 데이터는 반드시 Unix Timestamp(seconds) 형식이어야 합니다.
       * - 일봉 이상은 YYYY-MM-DD 형식을 지원합니다.
       */
      let formattedTime: any = time;
      if (!isMinute && dateStr && dateStr.length >= 8) {
        formattedTime = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      }

      return {
        time: formattedTime,
        open: safeNumber(item.openPrice),
        high: safeNumber(item.highPrice),
        low: safeNumber(item.lowPrice),
        close: safeNumber(item.closePrice || item.currentPrice),
        volume: safeNumber(item.accumulatedTradingVolume || item.volume)
      };
    });

    // 데이터 유효성 검사 (타임스탬프 필수)
    const validData = formattedData.filter(d => d.time !== 0);

    // 중복 제거 및 시간 오름차순 정렬 (차트 렌더링 에러 방지)
    const uniqueData = Array.from(new Map(validData.map(item => [item.time, item])).values());
    const sortedData = uniqueData.sort((a: any, b: any) => {
      const tA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime() / 1000;
      const tB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime() / 1000;
      return tA - tB;
    });

    return NextResponse.json({ success: true, data: sortedData });

  } catch (error: any) {
    /**
     * [api-architect] Fallback 응답:
     * - 예기치 못한 에러 상황에서도 안정적인 JSON 구조를 반환합니다.
     */
    console.error('[API-Architect] Chart Fetch Error:', error.message);
    return NextResponse.json({ 
      success: false, 
      data: null, 
      error: '증권 거래소 데이터를 불러오는 데 실패했습니다.' 
    }, { status: 500 });
  }
}
