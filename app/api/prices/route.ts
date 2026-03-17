import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codes = searchParams.get('codes');

    if (!codes) {
      return NextResponse.json({ success: false, error: 'Codes are required' }, { status: 400 });
    }

    // 네이버 실시간 시세 폴링 API (다중 종목 지원)
    const response = await fetch(
      `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${codes}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
          'Referer': 'https://m.stock.naver.com/'
        },
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch real-time prices from Naver');
    }

    const data = await response.json();
    const stocks = data?.result?.areas?.[0]?.datas || [];

    const priceMap = stocks.reduce((acc: any, stock: any) => {
      acc[stock.cd] = {
        itemCode: stock.cd,
        stockName: stock.nm,
        closePrice: stock.nv?.toLocaleString(),
        rawPrice: stock.nv,
        fluctuationsRatio: stock.cr,
        volume: stock.aq?.toLocaleString(),
        rawVolume: stock.aq,
        fluctuationType: stock.rf === '2' ? 'UP' : stock.rf === '5' ? 'DOWN' : 'SAME'
      };
      return acc;
    }, {});

    return NextResponse.json({ 
      success: true, 
      data: priceMap
    });

  } catch (error: any) {
    console.error('Prices API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
