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

// 개별 종목 상세/고급 지표 패치 (방어 로직 포함)
async function fetchIntegration(itemCode: string) {
  const url = `${INTEGRATION_URL}/${itemCode}/integration`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Integration Fetch Error for ${itemCode}:`, e);
    return null; // 단일 종목 실패 시 null 반환하여 전체 중단 방지
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
  const urlObj = new URL(request.url);
  // [20차] 한글 파라미터 안전 디코딩 적용
  const category = decodeURIComponent(urlObj.searchParams.get('category') || '');

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
        // 특수 탭은 거래량 데이터를 기반으로 서버에서 가공
        stockUrl = `${NAVER_STOCK_URL}/quant/KOSPI?page=1&pageSize=100`;
        isSpecialFilter = true;
        break;
      default:
        stockUrl = `${NAVER_STOCK_URL}/marketValue/KOSPI?page=1&pageSize=30`;
    }

    const stockRes = await fetch(stockUrl, { cache: 'no-store' });
    const stockData = await stockRes.json();
    
    // [20차] 네이버 API 응답 구조 다양성 대응 (defensive extraction)
    let rawStocks = 
      stockData.stocks || 
      stockData.result?.stocks || 
      stockData.result?.itemList || 
      stockData.result || 
      [];
    
    if (!Array.isArray(rawStocks)) rawStocks = [];

    // 특수 탭 서버 사이드 가공 처리
    if (isSpecialFilter && rawStocks.length > 0) {
      if (category === '거래량급증') {
        rawStocks.sort((a: any, b: any) => parseFloat(b.fluctuationsRatio || 0) - parseFloat(a.fluctuationsRatio || 0));
      } else if (category === '거래량급락') {
        rawStocks.sort((a: any, b: any) => parseFloat(a.fluctuationsRatio || 0) - parseFloat(b.fluctuationsRatio || 0));
      } else if (category === '골든크로스') {
        rawStocks = rawStocks.filter((s: any) => parseFloat(s.fluctuationsRatio || 0) > 1.0);
      }
      rawStocks = rawStocks.slice(0, 30);
    }

    // 3. 각 종목별 상세 지표 통합 패치 (방어적 비동기 처리)
    // entries()를 사용하여 인덱스와 함께 처리
    const detailedStocks = await Promise.all(rawStocks.map(async (stock: any) => {
      const code = stock.itemCode || stock.symbolCode;
      if (!code) return null;

      // [20차] 개별 호출 실패 시 전체 중단을 막기 위해 fetchIntegration 내부에서 에러 핸들링됨
      const detail = await fetchIntegration(code);
      
      const infos = detail?.totalInfos || [];
      const high52w = infos.find((i: any) => i.code === 'highPriceOf52Weeks')?.value || '-';
      const low52w = infos.find((i: any) => i.code === 'lowPriceOf52Weeks')?.value || '-';
      
      const targetPriceStr = detail?.consensusInfo?.priceTargetMean || '0';
      const currentPriceStr = stock.closePrice || stock.now || '0';
      
      // 숫자 파싱 안전 처리
      const parsePrice = (val: any) => parseFloat(val?.toString().replace(/,/g, '') || '0');
      const targetPriceNum = parsePrice(targetPriceStr);
      const currentPriceNum = parsePrice(currentPriceStr);
      
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
        stockName: stock.stockName || stock.itemName || 'Unknown',
        closePrice: currentPriceStr.toString(), // 콤마 포함 여부에 상관없이 원본 활용 선호
        fluctuationsRatio: (stock.fluctuationsRatio || '0').toString().replace('+', ''),
        volume: volumeFormatted,
        high52w,
        low52w,
        targetPrice: targetPriceStr === '0' ? '-' : targetPriceStr.toString(),
        upsidePotential,
        opinion: getOpinionText(opinionMean)
      };
    }));

    // null 값 필터링 (잘못된 데이터 배제)
    return NextResponse.json(detailedStocks.filter(s => s !== null));

  } catch (error) {
    console.error('Market API Route Fatal Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
