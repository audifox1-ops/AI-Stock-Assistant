import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

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
    return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
  }

  /**
   * 네이버 실시간/장기 차트 JSON API 맵핑
   * - 분봉: /minute?interval=1,3,5
   * - 일봉 이상: ?periodType=dayCandle, weekCandle, monthCandle
   */
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
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const json = await res.json();
    
    // 네이버 JSON 응답 처리
    // 분봉 계열은 바로 배열로 오고, 일/주/월은 priceInfos 객체 내에 있음
    let rawData: any[] = [];
    if (Array.isArray(json)) {
      rawData = json;
    } else if (json && json.priceInfos && Array.isArray(json.priceInfos)) {
      rawData = json.priceInfos;
    }

    const formattedData = rawData.map((item: any) => {
      const dateStr = item.localDateTime || item.localDate || item.startTime;
      const time = convertToUnix(dateStr);
      
      // lightweight-charts는 날짜(YYYY-MM-DD) 또는 timestamp(seconds)를 받음
      let formattedTime: any = time;
      if (!isMinute && dateStr && dateStr.length >= 8) {
        formattedTime = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      }

      return {
        time: formattedTime,
        open: item.openPrice,
        high: item.highPrice,
        low: item.lowPrice,
        close: item.closePrice || item.currentPrice, // 분봉은 currentPrice가 종가 역할
        volume: item.accumulatedTradingVolume || item.volume || 0
      };
    });

    // 데이터가 유효한지 확인 (open/close 등이 존재하는지)
    const validData = formattedData.filter(d => 
      d.time && 
      typeof d.open === 'number' && 
      typeof d.close === 'number'
    );

    // 중복 제거 및 시간 오름차순 정렬
    const uniqueData = validData.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
    const sortedData = uniqueData.sort((a: any, b: any) => {
      const tA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime() / 1000;
      const tB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime() / 1000;
      return tA - tB;
    });

    return NextResponse.json({ success: true, data: sortedData });
  } catch (error) {
    console.error('Naver JSON Chart API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
