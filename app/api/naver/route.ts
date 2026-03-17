import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SEARCH_VOLUME_URL = 'https://m.stock.naver.com/front-api/stock/domestic/stockList';
const INTEGRATION_URL = 'https://m.stock.naver.com/api/stock';

async function fetchStockList(type: string, category: string) {
  let url = '';
  
  // [16차] 신규 탭(급증/급락/골든크로스) 매핑 로직 확장
  if (type === 'marketValue') {
    url = `https://m.stock.naver.com/api/stocks/marketValue/${category}?page=1&pageSize=30`;
  } else if (type === 'search') {
    url = `${SEARCH_VOLUME_URL}?sortType=searchTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  } else if (type === 'volume') {
    url = `${SEARCH_VOLUME_URL}?sortType=quantTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  } else if (type === 'jump') {
    url = `${SEARCH_VOLUME_URL}?sortType=quantJumpTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  } else if (type === 'fall') {
    url = `${SEARCH_VOLUME_URL}?sortType=quantFallTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  } else if (type === 'golden') {
    url = `${SEARCH_VOLUME_URL}?sortType=goldenCrossTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  }

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  
  if (type === 'marketValue') {
    return data.stocks || [];
  } else {
    return data?.result?.stocks || [];
  }
}

async function fetchIntegration(itemCode: string) {
  const url = `${INTEGRATION_URL}/${itemCode}/integration`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data;
}

// 네이버 차트 데이터 프록시
async function fetchChartData(itemCode: string) {
  const url = `https://m.stock.naver.com/api/stock/${itemCode}/chart/day?range=1month`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'marketValue'; 
  const category = searchParams.get('category') || 'KOSPI';
  const itemCode = searchParams.get('itemCode');
  const mode = searchParams.get('mode');

  try {
    if (mode === 'chart' && itemCode) {
      const chartData = await fetchChartData(itemCode);
      return NextResponse.json(chartData);
    }

    const stocks = await fetchStockList(type, category);

    const detailedStocks = await Promise.all(stocks.map(async (stock: any) => {
      const code = stock.itemCode;
      const detail = await fetchIntegration(code);
      
      const infos = detail?.totalInfos || [];
      const high52w = infos.find((i: any) => i.code === 'highPriceOf52Weeks')?.value || '-';
      const low52w = infos.find((i: any) => i.code === 'lowPriceOf52Weeks')?.value || '-';
      
      const targetPriceStr = detail?.consensusInfo?.priceTargetMean || '0';
      const currentPriceStr = stock.closePrice || '0';
      
      const targetPriceNum = parseFloat(targetPriceStr.toString().replace(/,/g, ''));
      const currentPriceNum = parseFloat(currentPriceStr.toString().replace(/,/g, ''));
      
      let upsidePotential = '-';
      if (targetPriceNum > 0 && currentPriceNum > 0) {
        const potential = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;
        upsidePotential = potential.toFixed(1);
      }

      const opinionMean = detail?.consensusInfo?.recommMean || null;

      const volumeRaw = stock.accumulatedTradingVolume || '0';
      const volumeFormatted = parseInt(volumeRaw.toString().replace(/,/g, '')).toLocaleString();

      return {
        itemCode: code,
        stockName: stock.stockName,
        closePrice: stock.closePrice,
        fluctuationsRatio: stock.fluctuationsRatio,
        volume: volumeFormatted,
        high52w,
        low52w,
        targetPrice: targetPriceStr === '0' ? '-' : targetPriceStr,
        upsidePotential,
        opinion: getOpinionText(opinionMean)
      };
    }));

    return NextResponse.json(detailedStocks);
  } catch (error) {
    console.error('Naver API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}

function getOpinionText(score: any) {
  const num = parseFloat(score);
  if (isNaN(num) || score === null) return '-';
  if (num >= 4.0) return '매수';
  if (num >= 3.0) return '중립';
  if (num > 0) return '매도';
  return '-';
}
