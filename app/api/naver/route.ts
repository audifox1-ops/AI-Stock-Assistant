import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SEARCH_VOLUME_URL = 'https://m.stock.naver.com/front-api/stock/domestic/stockList';
const INTEGRATION_URL = 'https://m.stock.naver.com/api/stock';

async function fetchStockList(type: string, category: string) {
  let url = '';
  if (type === 'marketValue') {
    url = `https://m.stock.naver.com/api/stocks/marketValue/${category}?page=1&pageSize=30`;
  } else if (type === 'search') {
    url = `${SEARCH_VOLUME_URL}?sortType=searchTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  } else if (type === 'volume') {
    url = `${SEARCH_VOLUME_URL}?sortType=quantTop&category=all&pageSize=30&domesticStockExchangeType=NXT&page=1`;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'marketValue'; 
  const category = searchParams.get('category') || 'KOSPI';

  try {
    const stocks = await fetchStockList(type, category);

    const detailedStocks = await Promise.all(stocks.map(async (stock: any) => {
      const code = stock.itemCode;
      const detail = await fetchIntegration(code);
      
      const infos = detail?.totalInfos || [];
      const high52 = infos.find((i: any) => i.code === 'highPriceOf52Weeks')?.value || '-';
      const low52 = infos.find((i: any) => i.code === 'lowPriceOf52Weeks')?.value || '-';
      
      const targetPriceStr = detail?.consensusInfo?.priceTargetMean || '0';
      const currentPriceStr = stock.closePrice || '0';
      
      // 상승 여력 계산 로직 (upsidePotential)
      const targetPriceNum = parseFloat(targetPriceStr.toString().replace(/,/g, ''));
      const currentPriceNum = parseFloat(currentPriceStr.toString().replace(/,/g, ''));
      
      let upsidePotential = '-';
      if (targetPriceNum > 0 && currentPriceNum > 0) {
        const potential = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;
        upsidePotential = potential.toFixed(1);
      }

      const opinionMean = detail?.consensusInfo?.recommMean || null;

      return {
        itemCode: code,
        stockName: stock.stockName,
        closePrice: stock.closePrice,
        fluctuationsRatio: stock.fluctuationsRatio,
        accumulatedTradingVolume: stock.accumulatedTradingVolume,
        high52,
        low52,
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
