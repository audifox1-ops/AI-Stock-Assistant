import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NAVER_STOCK_URL = 'https://m.stock.naver.com/api/stocks';
const INTEGRATION_URL = 'https://m.stock.naver.com/api/stock';

async function fetchIndex(index: string) {
  const url = `https://m.stock.naver.com/api/index/${index}/basic`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    const result = data.result || data;
    return {
      name: index,
      price: result.now || result.closePrice || '-',
      changePrice: result.compareToPreviousClosePrice || '0',
      changeRate: result.fluctuationsRatio || '0',
      isUp: parseFloat(result.fluctuationsRatio || '0') >= 0
    };
  } catch (e) {
    return { name: index, price: '-', changePrice: '0', changeRate: '0', isUp: false };
  }
}

// 개별 종목 상세/고급 지표 패치
async function fetchIntegration(itemCode: string) {
  const url = `${INTEGRATION_URL}/${itemCode}/integration`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return await res.json();
  } catch (e) {
    return null;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // KOSPI, KOSDAQ, 거래량상위 등

  try {
    // 1. 카테고리 파라미터가 없으면 지수 데이터만 반환 (헤더용)
    if (!category) {
      const [kospi, kosdaq] = await Promise.all([
        fetchIndex('KOSPI'),
        fetchIndex('KOSDAQ')
      ]);
      return NextResponse.json([kospi, kosdaq]);
    }

    // 2. 종목 랭킹 API URL 스위칭
    let stockUrl = '';
    let isSpecialFilter = false;

    switch (category) {
      case 'KOSPI':
        stockUrl = `${NAVER_STOCK_URL}/marketValue/KOSPI?page=1&pageSize=30`;
        break;
      case 'KOSDAQ':
        stockUrl = `${NAVER_STOCK_URL}/marketValue/KOSDAQ?page=1&pageSize=30`;
        break;
      case '거래량상위':
        stockUrl = `${NAVER_STOCK_URL}/quant/KOSPI?page=1&pageSize=30`;
        break;
      case '검색상위':
        stockUrl = `${NAVER_STOCK_URL}/popular?page=1&pageSize=30`;
        break;
      case '거래량급증':
      case '거래량급락':
      case '골든크로스':
        // 특수 탭은 일단 거래량 상위 100개를 가져와서 서버에서 가공
        stockUrl = `${NAVER_STOCK_URL}/quant/KOSPI?page=1&pageSize=100`;
        isSpecialFilter = true;
        break;
      default:
        stockUrl = `${NAVER_STOCK_URL}/marketValue/KOSPI?page=1&pageSize=30`;
    }

    const stockRes = await fetch(stockUrl, { cache: 'no-store' });
    const stockData = await stockRes.json();
    let rawStocks = stockData.stocks || stockData.result?.stocks || [];

    // [18차] 특수 탭 서버 사이드 가공 처리
    if (isSpecialFilter) {
      if (category === '거래량급증') {
        // 등락률이 높은 순으로 정렬
        rawStocks.sort((a: any, b: any) => parseFloat(b.fluctuationsRatio) - parseFloat(a.fluctuationsRatio));
      } else if (category === '거래량급락') {
        // 등락률이 낮은 순으로 정렬
        rawStocks.sort((a: any, b: any) => parseFloat(a.fluctuationsRatio) - parseFloat(b.fluctuationsRatio));
      } else if (category === '골든크로스') {
        // 임시 Fallback: 거래량 상위 중 상승세(>1%)인 종목 필터링
        rawStocks = rawStocks.filter((s: any) => parseFloat(s.fluctuationsRatio) > 1.0);
      }
      rawStocks = rawStocks.slice(0, 30);
    }

    // 3. 각 종목별 상세 지표 통합 패치 (52주 고저, 목표가 등)
    const detailedStocks = await Promise.all(rawStocks.map(async (stock: any) => {
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
      const volumeRaw = stock.accumulatedTradingVolume || stock.volume || '0';
      const volumeFormatted = parseInt(volumeRaw.toString().replace(/,/g, '')).toLocaleString();

      return {
        itemCode: code,
        stockName: stock.stockName,
        closePrice: stock.closePrice,
        fluctuationsRatio: stock.fluctuationsRatio.replace('+', ''),
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
    console.error('Market API Route Error:', error);
    return NextResponse.json([], { status: 200 }); // 에러 시 빈 배열 반환하여 무한 로딩 방지
  }
}
