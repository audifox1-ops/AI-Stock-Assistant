import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchIndex(index: string) {
  const url = `https://m.stock.naver.com/api/index/${index}/basic`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return {
    name: index,
    price: data.now,
    changePrice: data.compareToPreviousClosePrice,
    changeRate: data.fluctuationsRatio,
    isUp: parseFloat(data.fluctuationsRatio) >= 0
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
    return NextResponse.json({ error: 'Failed to fetch market indices' }, { status: 500 });
  }
}
