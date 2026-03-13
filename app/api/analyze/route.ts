import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, currentPrice, rate, supplyTrend } = data;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      주식 종목 분석 요청:
      - 종목명: ${name}
      - 현재가: ${currentPrice}원
      - 수익률: ${rate}%
      - 최근 수급 동향: ${supplyTrend}

      위 데이터를 바탕으로 다음 질문에 답해줘:
      1. 이 종목이 단기, 스윙, 장기 중 어느 투자 성향에 가장 적합한가?
      2. 추가 매수(추매) 또는 손절 타이밍은 언제인가?
      3. 적정 목표가는 얼마인가?

      조건: 반드시 한국어로 답변하고, 전체 내용을 3줄 이내로 명확하게 요약해줘.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
