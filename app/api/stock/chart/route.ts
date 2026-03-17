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
   * - 분봉: /minute, /minute3, /minute5
   * - 일봉 이상: /day, /week, /month
   */
  let url = '';
  let isMinute = false;

  switch (timeframe) {
    case '1m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute`;
      isMinute = true;
      break;
    case '3m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute3`;
      isMinute = true;
      break;
    case '5m':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/minute5`;
      isMinute = true;
      break;
    case 'day':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/day`;
      break;
    case 'week':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/week`;
      break;
    case 'month':
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/month`;
      break;
    default:
      url = `https://api.stock.naver.com/chart/domestic/item/${ticker}/day`;
  }

  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const json = await res.json();
    
    // 네이버 JSON 응답 처리
    // 분봉 계열은 바로 배열로 오고, 일/주/월은 priceInfos 객체 내에 있음
    let rawData: any[] = [];
    if (Array.isArray(json)) {
      rawData = json;
    } else if (json.priceInfos && Array.isArray(json.priceInfos)) {
      rawData = json.priceInfos;
    }

    const formattedData = rawData.map((item: any) => {
      const time = convertToUnix(item.localDateTime || item.startTime);
      
      return {
        time: isMinute ? time : `${(item.localDateTime || item.startTime).substring(0, 4)}-${(item.localDateTime || item.startTime).substring(4, 6)}-${(item.localDateTime || item.startTime).substring(6, 8)}`,
        open: item.openPrice,
        high: item.highPrice,
        low: item.lowPrice,
        close: item.closePrice,
        volume: item.accumulatedTradingVolume || item.volume || 0
      };
    });

    // 중복 제거 및 시간 오름차순 정렬
    const uniqueData = formattedData.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);
    const sortedData = uniqueData.sort((a: any, b: any) => {
      const tA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const tB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return tA - tB;
    });

    return NextResponse.json({ success: true, data: sortedData });
  } catch (error) {
    console.error('Naver JSON Chart API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
