import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/'
};

/**
 * 네이버 XML 차트 데이터를 JSON으로 파싱
 */
function parseNaverXml(xml: string, isMinute: boolean) {
  const regex = /<item data="([^"]+)"\s*\/>/g;
  const result = [];
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const rawData = match[1].split('|');
    if (rawData.length < 6) continue;

    const rawTime = rawData[0]; // YYYYMMDD 또는 YYYYMMDDHHmm
    let time: string | number;

    if (isMinute) {
      // 분봉 처리: YYYYMMDDHHmm -> UNIX Timestamp (seconds)
      const year = parseInt(rawTime.substring(0, 4));
      const month = parseInt(rawTime.substring(4, 6)) - 1;
      const day = parseInt(rawTime.substring(6, 8));
      const hour = parseInt(rawTime.substring(8, 10));
      const min = parseInt(rawTime.substring(10, 12));
      time = Math.floor(new Date(year, month, day, hour, min).getTime() / 1000);
    } else {
      // 일/주/월봉 처리: YYYYMMDD -> YYYY-MM-DD
      time = `${rawTime.substring(0, 4)}-${rawTime.substring(4, 6)}-${rawTime.substring(6, 8)}`;
    }

    result.push({
      time: time,
      open: parseFloat(rawData[1]),
      high: parseFloat(rawData[2]),
      low: parseFloat(rawData[3]),
      close: parseFloat(rawData[4]),
      volume: parseFloat(rawData[5])
    });
  }

  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const timeframe = searchParams.get('timeframe') || 'day'; // day, week, month, 1, 3, 5

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
  }

  // timeframe 매핑
  // Naver fchart API: day, week, month, 1, 3, 5, 10, 30, 60
  let tf = timeframe;
  if (timeframe === '1m') tf = '1';
  if (timeframe === '3m') tf = '3';
  if (timeframe === '5m') tf = '5';

  const isMinute = ['1', '3', '5', '10', '30', '60'].includes(tf);
  const count = 500; // 충분한 데이터 확보

  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${ticker}&timeframe=${tf}&count=${count}&requestType=0`;

  try {
    const res = await fetch(url, { headers: REQUEST_HEADERS, next: { revalidate: 0 } });
    const xml = await res.text();
    const data = parseNaverXml(xml, isMinute);

    return NextResponse.json({ success: true, data: data });
  } catch (error) {
    console.error('Naver Chart API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
