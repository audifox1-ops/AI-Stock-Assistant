import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 허용된 도메인 리스트
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

export async function GET(req: NextRequest) {
  // CORS 검증
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const period = searchParams.get('period') || 'day';

    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
    }

    const response = await fetch(
      `https://fchart.stock.naver.com/sise.nhn?symbol=${ticker}&timeframe=${period}&count=100&requestType=0`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Naver Finance');
    }

    const xmlText = await response.text();
    const itemRegex = /<item data="([^"]+)"/g;
    const chartData = [];
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const dataStr = match[1];
      const [date, open, high, low, close, volume] = dataStr.split('|');
      
      chartData.push({
        date,
        open: parseInt(open),
        high: parseInt(high),
        low: parseInt(low),
        close: parseInt(close),
        volume: parseInt(volume)
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        data: chartData,
        ticker,
        period
      },
      {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
      }
    );

  } catch (error: any) {
    console.error('Chart API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
