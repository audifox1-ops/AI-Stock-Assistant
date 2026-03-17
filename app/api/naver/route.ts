import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://m.stock.naver.com/front-api/stock/domestic/stockList';
const DETAIL_BASE_URL = 'https://m.stock.naver.com/api/stock';

async function fetchNaverList(sortType: string, category: string = 'all') {
  const url = `${BASE_URL}?sortType=${sortType}&category=${category}&pageSize=30&domesticStockExchangeType=NXT&page=1`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data?.result?.stocks || [];
}

async function fetchNaverDetail(itemCode: string) {
  const url = `${DETAIL_BASE_URL}/${itemCode}/integration`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'marketValue';
  const category = searchParams.get('category') || 'KOSPI';

  try {
    let sortType = 'marketValue';
    if (type === 'search') sortType = 'searchTop';
    else if (type === 'volume') sortType = 'quantTop';

    const stocks = await fetchNaverList(sortType, category);

    // 상세 데이터가 필요한 경우 (첫 5개 정도만 미리 가져오거나, 필요 지표만 추출)
    // 여기서는 사용자가 요청한 모든 열값(현재가, 등락률, 거래량, 52주 고저, 목표주가, 투자의견)을 위해 
    // 리스트 데이터에 없는 정보(52주 고저 등)를 보완해야 함.
    // 성능상 전체 30개를 다 가져오기보다 기본 리스트 데이터를 반환하고,
    // 클라이언트에서 개별 상세를 요청하거나 상위 몇 가지만 서버에서 병합 처리.
    
    // 상위 10개만 상세 지표 병합 처리 (성능 타협)
    const processedStocks = await Promise.all(stocks.slice(0, 30).map(async (stock: any) => {
      // 리스트 데이터에 기본적으로 있는 것: closePrice, fluctuationsRatio, accumulatedTradingVolume
      const detail = await fetchNaverDetail(stock.itemCode);
      
      const infos = detail?.totalInfos || [];
      const high52 = infos.find((i: any) => i.code === 'highPriceOf52Weeks')?.value || '-';
      const low52 = infos.find((i: any) => i.code === 'lowPriceOf52Weeks')?.value || '-';
      const targetPrice = detail?.consensusInfo?.priceTargetMean || '-';
      const opinion = detail?.consensusInfo?.recommMean || '-';

      return {
        symbol: stock.itemCode,
        name: stock.stockName,
        price: stock.closePrice,
        changeRate: stock.fluctuationsRatio,
        volume: stock.accumulatedTradingVolume,
        high52,
        low52,
        targetPrice,
        opinion: getOpinionText(opinion)
      };
    }));

    return NextResponse.json(processedStocks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Naver data' }, { status: 500 });
  }
}

function getOpinionText(score: any) {
  const num = parseFloat(score);
  if (isNaN(num)) return '-';
  if (num >= 4.0) return '매수 (Strong Buy)';
  if (num >= 3.0) return '중립 (Hold)';
  return '매도 (Sell)';
}
