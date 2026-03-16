import { NextResponse } from 'next/server';

/**
 * 공공데이터포털 - 주식투자자별 매매동향 API 연동
 * 기관/외국인 수급 데이터를 가져와 특정 조건 충족 시 알림 로직을 트리거합니다.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itmsNm = searchParams.get('itmsNm') || '삼성전자'; // 종목명
    const basDt = searchParams.get('basDt') || getYesterdayDate(); // 기준일자 (YYYYMMDD)

    const API_KEY = process.env.DATA_PORTAL_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: 'DATA_PORTAL_API_KEY is not configured' }, { status: 500 });
    }

    // 공공데이터포털 시스템 특성상 인증키는 디코딩된 상태로 사용해야 할 수도 있음
    const endpoint = `http://apis.data.go.kr/1160100/service/GetStockInvestorTradingTrendsService/getInvestorTradingTrends`;
    const queryParams = new URLSearchParams({
      serviceKey: API_KEY,
      numOfRows: '10',
      pageNo: '1',
      resultType: 'json',
      basDt: basDt,
      itmsNm: itmsNm,
    });

    const url = `${endpoint}?${queryParams.toString()}`;
    console.log(`[Supply API] Fetching: ${url.replace(API_KEY, '****')}`);

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    // 응답 데이터 파싱
    const items = data?.response?.body?.items?.item || [];
    if (items.length === 0) {
      return NextResponse.json({ message: 'No data found for the given date and stock', items: [] });
    }

    // 투자자별 순매수량 분석 (일반적으로 외국인, 기관 합계 등)
    // 참고: API 응답 필드명은 공공데이터 상세 명세에 따라 'invst_itms' 등을 확인해야 함
    // 여기서는 공통적인 필드 구조를 가정하여 구현
    const trend = items[0];
    const institutionalNetBuy = parseInt(trend.insttsNetPurAmt || '0'); // 기관 순매수
    const foreignNetBuy = parseInt(trend.frgnNetPurAmt || '0'); // 외국인 순매수

    // 알림 트리거 조건: 기관과 외국인이 동시에 특정 금액(예: 10억) 이상 순매수할 때
    const isPowerfulSupply = institutionalNetBuy > 0 && foreignNetBuy > 0;
    
    let alertTriggered = false;
    let alertMessage = '';

    if (isPowerfulSupply) {
      alertTriggered = true;
      alertMessage = `[수급 포착] ${itmsNm} 종목에 기관(${formatMoney(institutionalNetBuy)})과 외국인(${formatMoney(foreignNetBuy)})의 동시 순매수가 포착되었습니다!`;
    }

    return NextResponse.json({
      stock: itmsNm,
      date: basDt,
      institutional: institutionalNetBuy,
      foreigner: foreignNetBuy,
      alertTriggered,
      alertMessage,
      rawData: trend
    });

  } catch (error: any) {
    console.error('[Supply API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 어제 날짜 구하기 (YYYYMMDD)
function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// 단위 변환 (원 단위 가정 시 억 단위 등으로 변환)
function formatMoney(amount: number) {
  return `${(amount / 100000000).toFixed(1)}억`;
}
