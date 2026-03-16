import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

/**
 * Gemini AI 주식 분석 API
 * GOOGLE_GEMINI_API_KEY 환경변수를 사용합니다.
 * 종목 데이터(가격, 등락률, 수급 등)를 기반으로 3줄 투자 전략을 생성합니다.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    // 1. 필수 데이터 유효성 검사
    if (!symbol || !name) {
      return NextResponse.json(
        { analysis: "분석을 위한 종목 정보(이름, 티커)가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 2. API 키 확인
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.error("[AI API] GOOGLE_GEMINI_API_KEY is not configured properly.");
      return NextResponse.json({
        analysis: "AI 엔진의 API 키가 설정되지 않았습니다. 환경변수 설정을 확인해 주세요.",
      });
    }

    // 3. Gemini SDK 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. 프롬프트 구성 (데이터가 누락된 경우를 대비한 가공)
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

    // 5. AI 스트리밍 요청 (성능을 위해 일반 생성 사용)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI response text is empty");
    }

    return NextResponse.json({ analysis: text });

  } catch (error: any) {
    console.error("[AI API] Error during Gemini analysis:", error);
    
    // 구체적인 에러 원인 분석
    let errorMessage = "AI 분석 리포트를 생성하는 중 오류가 발생했습니다.";
    if (error.message?.includes("API_KEY_INVALID")) {
      errorMessage = "Gemini API 키가 유효하지 않습니다.";
    } else if (error.message?.includes("quota")) {
      errorMessage = "AI 서비스 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
    }

    return NextResponse.json(
      { analysis: errorMessage, details: error.message },
      { status: 200 } // 프론트엔드에서 에러 메시지를 자연스럽게 노출하기 위해 200 반환
    );
  }
}
