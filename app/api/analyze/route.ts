import { NextResponse } from "next/server";

/**
 * Gemini AI 주식 분석 API (Raw Fetch 방식)
 * GOOGLE_GEMINI_API_KEY 환경변수를 사용하여 Google AI Studio API를 직접 호출합니다.
 * SDK 의존성을 제거하여 패키지 충돌을 방지하고 상세한 에러 메시지를 반환합니다.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    // 1. 필수 데이터 유효성 검사
    if (!symbol || !name) {
      return NextResponse.json(
        { error: "분석을 위한 종목 정보(이름, 티커)가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 2. API 키 확인
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        error: "Gemini API 키가 프로젝트에 설정되지 않았습니다. .env 환경변수를 확인해 주세요.",
      }, { status: 500 });
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
      4. 데이터가 부족한 경우 추측보다는 현재 시장 흐름에 따른 조언을 제공할 것.
    `;

    // 4. Gemini Raw Fetch API 호출
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API 호출 실패: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error("AI 응답 데이터에서 전략을 추출할 수 없습니다.");
    }

    return NextResponse.json({ analysis: analysisText });

  } catch (error: any) {
    console.error("[AI API] Error during Gemini analysis:", error);
    
    // 에러 메시지 세분화
    let errorMessage = error.message || "AI 분석 중 알 수 없는 오류가 발생했습니다.";
    if (errorMessage.includes("API Key")) {
      errorMessage = "유효하지 않은 API 키입니다. Google AI Studio에서 키를 재발급받으세요.";
    } else if (errorMessage.includes("quota")) {
      errorMessage = "API 호출 할당량이 초과되었습니다. 잠시 후 상위 모델로 시도해 주세요.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
