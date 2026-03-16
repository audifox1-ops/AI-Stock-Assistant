import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    if (!symbol || !name) {
      return NextResponse.json({ error: "분석을 위한 데이터가 부족합니다." }, { status: 200 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 200 });
    }

    const currentPriceStr = price ? `${Number(price).toLocaleString()}원` : "공유되지 않음";
    const changeStr = changePercent !== undefined ? `${changePercent}%` : "정보 없음";

    const prompt = `
      당신은 대한민국 거시경제 전문가이자 주식 전략가입니다.
      다음 종목 [${name} (${symbol})]의 정보를 바탕으로 향후 투자 전망을 '3줄 리포트'로 작성하세요.
      
      [분석 데이터]
      - 종목명: ${name} / ${symbol}
      - 가격: ${currentPriceStr}
      - 등락: ${changeStr}
      - 수급: 기관(${institutional || 0}), 외인(${foreigner || 0})
      
      [지침]
      1. 한국어로 정중하게 작성할 것.
      2. 구조: 1) 차트 환경, 2) 수급 동향, 3) 향후 대응책으로 구성.
      3. 전문적이고 통찰력 있는 문장을 사용할 것.
    `;

    // Gemini 1.5 Flash Latest 모델 사용 (Raw Fetch)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      }),
      cache: 'no-store' // AI 요청도 캐싱 멸균
    });

    if (!response.ok) {
        return NextResponse.json({ error: "AI 엔진 통신 오류" }, { status: 200 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({ analysis: resultText || "분석 리포트를 생성할 수 없습니다." }, { status: 200 });

  } catch (error: any) {
    console.error("AI API ERROR:", error);
    return NextResponse.json({ error: "분석 엔진 장애: 잠시 후 다시 시도해 주세요." }, { status: 200 });
  }
}
