import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { symbol, name, price, changePercent, institutional, foreigner } = await request.json();

    if (!symbol || !name) {
      return NextResponse.json({ error: "Symbol and Name are required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      당신은 전문 주식 투자 분석가입니다. 아래 제공된 주식 데이터를 바탕으로 현재 시장 상황을 분석하고 향후 투자 전략을 제안하세요.
      
      [주식 데이터]
      - 종목명: ${name} (${symbol})
      - 현재가: ${price?.toLocaleString()}원
      - 등락률: ${changePercent}%
      - 기관 순매수량: ${institutional?.toLocaleString() || '데이터 없음'}
      - 외국인 순매수량: ${foreigner?.toLocaleString() || '데이터 없음'}

      [출력 규칙]
      1. 응답은 '차트 분석', '수급 분석', '최종 의견' 세 가지 섹션으로 구분하세요.
      2. 각 섹션은 주식 투자자에게 실질적인 도움이 되는 핵심 내용만 1~2문장으로 간결하게 작성하세요.
      3. 마지막에는 전체 전략을 관통하는 "3줄 요약 투자 전략"을 포함하세요.
      4. 어조는 전문적이면서도 신뢰감 있게 작성하세요.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ analysis: text });
  } catch (error: any) {
    console.error("Gemini AI Analysis Error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
