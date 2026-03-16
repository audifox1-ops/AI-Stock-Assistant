import { NextResponse } from "next/server";

/**
 * Gemini AI 주식 분석 API (안정화 버전)
 * 모든 에러를 catch하여 200 상태 코드로 반환함으로써 프론트엔드 크래시를 방지합니다.
 * SDK 없이 Raw Fetch 방식을 사용하여 의존성 문제를 해결했습니다.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    // 1. 필수 데이터 유효성 검사
    if (!symbol || !name) {
      return NextResponse.json(
        { error: "분석을 위한 종목 정보가 누락되었습니다." },
        { status: 200 }
      );
    }

    // 2. API 키 확인
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        error: "API 키가 설정되지 않았습니다. .env 환경변수를 확인해 주세요.",
      }, { status: 200 });
    }

    // 3. 프롬프트 구성
    const currentPriceStr = price ? `${Number(price).toLocaleString()}원` : "데이터 없음";
    const changeStr = changePercent !== undefined ? `${changePercent}%` : "데이터 없음";
    const instStr = institutional !== undefined ? `${Number(institutional).toLocaleString()}원` : "분석 중";
    const foreignStr = foreigner !== undefined ? `${Number(foreigner).toLocaleString()}원` : "분석 중";

    const prompt = `
      당신은 대한민국 최고의 주식 투자 전문가입니다. 
      다음 데이터를 기반으로 [${name} (${symbol})] 종목에 대한 "3줄 요약 투자 전략"을 작성해 주세요.
      
      [데이터 현황]
      - 현재가: ${currentPriceStr}
      - 등락률: ${changeStr}
      - 기관 순매수량: ${instStr}
      - 외국인 순매수량: ${foreignStr}
      
      [작성 규칙]
      1. 반드시 한국어로 작성할 것.
      2. '차트 분석', '수급 분석', '최종 의견'으로 구분하여 총 3줄로 핵심만 요약할 것.
      3. 전문적이고 신뢰감 있는 말투를 사용할 것.
    `;

    // 4. Gemini Raw Fetch API 호출
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Gemini API 통신 실패");
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error("분석 데이터를 생성할 수 없습니다.");
    }

    return NextResponse.json({ analysis: analysisText }, { status: 200 });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 사용자 지침에 따라 500이 아닌 200으로 응답하여 프론트엔드에서 에러 메시지 처리 유도
    return NextResponse.json(
      { error: error.message || "분석 실패 (알 수 없는 서버 오류)" },
      { status: 200 }
    );
  }
}
