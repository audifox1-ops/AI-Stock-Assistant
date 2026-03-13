import yahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: "심볼이 필요합니다." }, { status: 400 });
    }

    // 최근 3개월 데이터 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }) as any[];

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
    }

    // [{ date: 'MM/DD', price: 12345 }, ...] 형식으로 변환
    const formattedData = result
      .filter((item: any) => item.close !== undefined)
      .map((item: any) => {
        const dateObj = new Date(item.date);
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return {
          date: `${month}/${day}`,
          price: Math.round(item.close)
        };
      });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("[History API] Error:", error);
    return NextResponse.json({ error: "주가 정보를 가져오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
