import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 허용된 도메인 리스트
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

const NAVER_FRONT_API = 'https://m.stock.naver.com/front-api';

function normalizeStockData(stock: any, type: 'list' | 'trend') {
  try {
    if (type === 'list') {
      return {
        itemCode: stock.itemCode || stock.code,
        stockName: stock.stockName || stock.name,
        closePrice: stock.closePrice || '0',
        fluctuationsRatio: stock.fluctuationsRatio || '0.00',
        volume: stock.accumulatedTradingVolume || '0',
        marketValue: stock.marketValueHangeul || '-',
        tradeValue: stock.accumulatedTradingValueKrwHangeul || '-',
        fluctuationType: stock.compareToPreviousPrice?.name || 'STABLE'
      };
    } else {
      return {
        itemCode: stock.itemCode || stock.code,
        stockName: stock.itemName || stock.name,
        closePrice: stock.closePrice || '0',
        fluctuationsRatio: stock.fluctuationsRatio || '0.00',
        volume: stock.accumulatedTradingVolume || '0',
        netBuyValue: stock.accumulatedTradingValueKrwHangeul || '-',
        rank: stock.ranking,
        fluctuationType: stock.fluctuationType || 'STABLE'
      };
    }
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  // CORS 검증
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = decodeURIComponent(searchParams.get('category') || 'KOSPI 시총상위');

  let apiUrl = '';
  let dataType: 'list' | 'trend' = 'list';

  switch (category) {
    case 'KOSPI 시총상위':
      apiUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
      dataType = 'list';
      break;
    case 'KOSDAQ 시총상위':
      apiUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSDAQ&pageSize=30&domesticStockExchangeType=KRX&page=1`;
      dataType = 'list';
      break;
    case '거래량상위':
      apiUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=quantTop&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
      dataType = 'list';
      break;
    case '외국인매매':
      apiUrl = `${NAVER_FRONT_API}/market/tradingTrend/ranking?periodType=daily&investorType=foreigner&tradingType=trendBuy&stockExchangeType=KRX`;
      dataType = 'trend';
      break;
    case '기관매매':
      apiUrl = `${NAVER_FRONT_API}/market/tradingTrend/ranking?periodType=daily&investorType=organization&tradingType=trendBuy&stockExchangeType=KRX`;
      dataType = 'trend';
      break;
    case '시가총액':
      apiUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
      dataType = 'list';
      break;
    default:
      apiUrl = `${NAVER_FRONT_API}/stock/domestic/stockList?sortType=marketValue&category=KOSPI&pageSize=30&domesticStockExchangeType=KRX&page=1`;
      dataType = 'list';
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.stock.naver.com/'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error('네이버 API 응답 오류');

    const data = await response.json();
    const rawStocks = data.result?.stocks || [];
    const normalizedData = rawStocks
      .map((s: any) => normalizeStockData(s, dataType))
      .filter((s: any) => s !== null);

    return NextResponse.json(
      {
        success: true,
        data: normalizedData,
        category: category,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
      }
    );

  } catch (error: any) {
    console.error('Market API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 }
    );
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
