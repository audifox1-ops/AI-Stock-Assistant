import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    if (!symbol || !name) {
      return NextResponse.json({ error: "분석 데이터(이름/티커)가 부족합니다." }, { status: 200 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "AI 엔진 설정(API Key)이 구성되지 않았습니다." }, { status: 200 });
    }

    const currentPriceStr = price ? `${Number(price).toLocaleString()}원` : "제공되지 않음";
    const changeStr = changePercent !== undefined ? `${changePercent}%` : "데이터 없음";

    // 분석 품질을 높이기 위한 인스트럭션 강화
    const prompt = `
      당신은 대한민국 실전 주무대에서 활동하는 전문 주식 분석가입니다.
      제공된 [${name} (${symbol})]의 정보를 바탕으로, 투자자가 즉시 참고할 수 있는 '핵심 3줄 대응 전략'을 작성하세요.
      
      [정보 요약]
      - 종목: ${name} / ${symbol}
      - 현재가: ${currentPriceStr}
      - 변동률: ${changeStr}
      - 수급 세력: 기관(${institutional || 0}), 외국인(${foreigner || 0})
      
      [형식 지침]
      1. 한국어로 정중하게 작성할 것.
      2. 구조: 
         - 1번째 줄: 현재의 기술적 패턴 (차트 성격)
         - 2번째 줄: 수급 주체 및 모멘텀 분석
         - 3번째 줄: 최종 투자 대응 방향 (매수/보관/관망 등)
      3. 불필요한 서술 없이 핵심만 날카롭게 전달할 것.
    `;

    // 최신 모델명 gemini-1.5-flash-latest 사용 및 정확한 JSON 구조 보장
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // 분석 일관성을 위한 낮은 온도
          maxOutputTokens: 300
        }
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Gemini API Error Response:", errorData);
        return NextResponse.json({ error: "AI 분석 서버와 일시적으로 연결되지 않습니다." }, { status: 200 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
        return NextResponse.json({ error: "분석 리포트를 생성하는 데 실패했습니다." }, { status: 200 });
    }

    return NextResponse.json({ analysis: resultText }, { status: 200 });

  } catch (error: any) {
    console.error("AI API SYSTEM ERROR:", error);
    return NextResponse.json({ error: "시스템 내부 장애로 일시 중단되었습니다." }, { status: 200 });
  }
}
