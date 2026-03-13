import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, currentPrice, rate, supplyTrend } = data;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      주식 종목 전문 분석 요청 (JSON 응답 필수):
      - 종목명: ${name}
      - 현재가: ${currentPrice}원
      - 수익률: ${rate}%
      - 최근 수급 동향: ${supplyTrend}

      위 데이터를 바탕으로 전문적인 투자 전략을 수립해줘. 
      반드시 아래의 JSON 구조로만 응답하고, 마크다운 태그(\`\`\`json) 등 추가 텍스트 없이 순수 JSON 문자열만 반환해.

      구조:
      {
        "position": "단기/스윙/장기 중 택 1",
        "action": "추매/손절/관망 중 택 1",
        "targetPrice": 숫자만 입력,
        "reason": "전문적인 분석 근거 2줄 요약"
      }

      조건: 
      - 한국어 사용
      - "reason"은 최대한 전문 용어를 섞어 핵심만 전달
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 마크다운 태그 및 불필요한 텍스트 제거를 위한 정교한 추출 로직
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    } else {
      text = text.replace(/```json|```/g, "").trim();
    }

    try {
      const jsonResponse = JSON.parse(text);
      
      // 필수 필드 검증 및 기본값 설정
      return NextResponse.json({
        position: jsonResponse.position || "분석 대기",
        action: jsonResponse.action || "관망",
        targetPrice: Number(jsonResponse.targetPrice) || 0,
        reason: jsonResponse.reason || "상세 분석 내용을 생성할 수 없습니다."
      });
    } catch (parseError) {
      console.error("JSON Parse Error:", text);
      return NextResponse.json({ 
        position: "분석 불가", 
        action: "관망", 
        targetPrice: 0, 
        reason: "AI 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요." 
      }, { status: 200 }); // 클라이언트에서 에러 처리를 위해 200으로 보내되 필드로 구분
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return NextResponse.json({ error: "분석 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
