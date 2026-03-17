import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { stockInfo } = await req.json();

    if (!stockInfo) {
      return NextResponse.json({ error: "분석할 종목 데이터가 없습니다." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `너는 냉철하고 전문적인 전문 주식 애널리스트야. 
다음 종목의 지표 데이터를 바탕으로 투자 전략 리포트를 작성해줘.

[종목 정보]
- 종목명: ${stockInfo.stockName} (${stockInfo.ticker})
- 현재가: ${stockInfo.price}원
- 52주 최고가: ${stockInfo.high52w}원
- 52주 최저가: ${stockInfo.low52w}원
- 증권사 목표가: ${stockInfo.targetPrice}원
- PER: ${stockInfo.per}
- PBR: ${stockInfo.pbr}
- 시가총액: ${stockInfo.marketCap}억원

[분석 지침]
1. 현재 주가가 52주 고점 대비 얼마나 하락했는지(하락폭 %)를 계산하여 심리적 지지선을 분석해.
2. 증권사 목표가와 현재가의 괴리율을 계산하여, 현재 주가가 저평가 구간인지 아니면 보수적 접근이 필요한지 전문적으로 판단해.
3. PER/PBR 지표를 산업 평균(가상)과 비교하여 밸류에이션 매력도를 평가해.
4. 마지막으로 '투자 의견(매수/관망/매도)'을 이유와 함께 명확히 제시해.

[출력 형식]
- 마크다운 기호를 쓰지 마라.
- 전문 용어를 적절히 섞어 애널리스트 톤으로 작성해.
- 모바일에서 읽기 편하게 군더더기 없이 깔끔하게 요약할 것.
- 결과만 한글로 상세히 적어줘.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json(
      { analysis: text },
      {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      }
    );
  } catch (error: any) {
    console.error("Stock AI Analysis Error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
