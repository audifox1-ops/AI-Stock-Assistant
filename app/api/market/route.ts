import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchIndex(index: string) {
  const url = `https://m.stock.naver.com/api/index/${index}/basic`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  
  // 사용자의 지침에 따라 result 객체 내부 파싱 및 필드명 보정
  // 실제 API 응답 구조가 flat하거나 result 뎁스가 있을 수 있으므로 두 경우 모두 대응
  const result = data.result || data;
  
  return {
    name: index,
    price: result.now || result.closePrice || '-',
    changePrice: result.compareToPreviousClosePrice || '0',
    changeRate: result.fluctuationsRatio || '0',
    isUp: parseFloat(result.fluctuationsRatio || '0') >= 0
  };
}

export async function GET() {
  try {
    const [kospi, kosdaq] = await Promise.all([
      fetchIndex('KOSPI'),
      fetchIndex('KOSDAQ')
    ]);

    return NextResponse.json([kospi, kosdaq]);
  } catch (error) {
    console.error('Market API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch market indices' }, { status: 500 });
  }
}
