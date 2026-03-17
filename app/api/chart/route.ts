import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const period = searchParams.get('period') || 'day';

    if (!ticker) {
      return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
    }

    // timeframe: day, week, month
    const response = await fetch(
      `https://fchart.stock.naver.com/sise.nhn?symbol=${ticker}&timeframe=${period}&count=100&requestType=0`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Naver Finance');
    }

    const xmlText = await response.text();
    
    // Regex to extract data from <item data="날짜|시가|고가|저가|종가|거래량" />
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

    return NextResponse.json({ 
      success: true, 
      data: chartData,
      ticker,
      period
    });

  } catch (error: any) {
    console.error('Chart API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
