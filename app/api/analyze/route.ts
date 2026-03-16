import { NextResponse } from "next/server";

// 실시간 데이터 동기화 강제 (Next.js 캐시 파괴)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    if (!symbol || !name) {
      return NextResponse.json({ error: "분석 데이터 부족" }, { status: 200 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 200 });
    }

    const prompt = `
      당신은 전문 주식 분석가입니다. [${name} (${symbol})]의 정보를 분석하여 '핵심 3줄 리포트'를 작성하세요.
      - 가격: ${price} / 변동: ${changePercent}%
      - 수급: 기관(${institutional || 0}), 외인(${foreigner || 0})
      - 형식: 1. 기술적 패턴, 2. 수급 모멘텀, 3. 최종 투자 의견
    `;

    // [최종 강제 주입] 원초적이고 안전한 REST API fetch 방식 사용
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
        return NextResponse.json({ error: "AI 서버 통신 실패" }, { status: 200 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ analysis: resultText || "분석 불가" }, { status: 200 });

  } catch (error: any) {
    console.error("ANALYSIS ERROR:", error);
    return NextResponse.json({ error: "AI 시스템 일시 정지" }, { status: 200 });
  }
}
