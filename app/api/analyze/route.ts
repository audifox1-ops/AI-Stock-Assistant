import { NextResponse } from "next/server";

/**
 * Gemini AI 주식 분석 API (모델 최적화 버전)
 * gemini-1.5-flash-latest 모델을 사용하여 응답 속도와 정확도를 향상시켰습니다.
 * 모든 에러는 200 상태 코드로 안전하게 반환되어 프론트엔드 UI를 파괴하지 않습니다.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    // 1. 필수 데이터 데이터 정합성 체크
    if (!symbol || !name) {
      return NextResponse.json(
        { error: "정확한 종목 분석을 위해 이름과 티커 정보가 필요합니다." },
        { status: 200 }
      );
    }

    // 2. 환경 변수 보안 로드
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        error: "시스템 분석 엔진(API Key)이 구성되지 않았습니다. 관리자에게 문의하세요.",
      }, { status: 200 });
    }

    // 3. 전문가 수준 분석 프롬프트 엔지니어링
    const currentPriceStr = price ? `${Number(price).toLocaleString()}원` : "데이터 없음";
    const changeStr = changePercent !== undefined ? `${changePercent}%` : "데이터 없음";
    const instStr = institutional !== undefined ? `${Number(institutional).toLocaleString()}원` : "매수세 분석 중";
    const foreignStr = foreigner !== undefined ? `${Number(foreigner).toLocaleString()}원` : "매수세 분석 중";

    const prompt = `
      당신은 대한민국 월스트리트 출신의 수석 주식 전략가입니다.
      아래 제공된 [${name} (${symbol})]의 실시간 시장 데이터를 심층 분석하여 
      투자자가 즉시 참고할 수 있는 "3줄 요약 핵심 전략"을 도출하세요.
      
      [실시간 시장 데이터]
      - 종목명/코드: ${name} / ${symbol}
      - 현재 주가: ${currentPriceStr}
      - 등락률: ${changeStr}
      - 기관 순매수: ${instStr}
      - 외국인 순매수: ${foreignStr}
      
      [출력 표준 지침]
      1. 반드시 한국어로 정중하고 전문적인 어조를 유지할 것.
      2. 구조: '1) 차트 패턴 분석', '2) 수급 및 모멘텀', '3) 종합 투자 대응'으로 구성할 것.
      3. 불필요한 서술은 제외하고 각 줄당 핵심 팩트 위주로 작성할 것.
      4. 절대적으로 신뢰감 있는 전문가의 문체를 사용할 것.
    `;

    // 4. Gemini 1.5 Flash Latest 엔진 호출 (Raw Fetch)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // 창의성 억제, 분석 정확도 우선
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 10
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "AI 엔진과의 통신에 실패했습니다.");
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("분석 리포트 생성 중 응답이 유실되었습니다.");
    }

    return NextResponse.json({ analysis: resultText }, { status: 200 });

  } catch (error: any) {
    console.error("[CRITICAL] Gemini API Exception:", error);
    // 서버 오류 발생 시 프론트엔드에 안전한 에러 객체 전달 (상태 코드 200 유지)
    return NextResponse.json(
      { error: "API 연결 실패: 현재 분석 엔진 점검 중입니다. 잠시 후 시도해 주세요." },
      { status: 200 }
    );
  }
}
