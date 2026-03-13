import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, currentPrice, rate, supplyTrend, type } = data; // type: 'holding' | 'interest'

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let modeSpecificPrompt = "";
    if (type === 'interest') {
      modeSpecificPrompt = `
        분석 모드: 관심종목 (신규 진입 분석)
        - 목표: 신규 진입 적정성 및 매수 타이밍 도출
        - action 항목: "매수권장", "관망", "진입금지" 중 반드시 하나 선택
        - targetPrice: 단기 목표가 또는 적정 매집가 수준 제안
        - reason: 현재 가격대에서의 진입 매력도와 수급 상황을 기술 (2줄 요약)
      `;
    } else {
      modeSpecificPrompt = `
        분석 모드: 보유종목 (수익/리스크 관리)
        - 목표: 수익 실현 및 리스크 관리 (익절/손절/홀딩) 전략 수립
        - action 항목: "추매", "익절", "손절", "홀딩" 중 반드시 하나 선택
        - targetPrice: 최종 목표가(익절가) 제안
        - reason: 현재 수익률(${rate}%) 대비 향후 상승 여력 및 대응 전략 기술 (2줄 요약)
      `;
    }

    const prompt = `
      주식 종목 전문 분석 요청 (JSON 응답 필수):
      - 종목명: ${name}
      - 현재가: ${currentPrice}원
      - 최근 수급 동향: ${supplyTrend}
      ${modeSpecificPrompt}

      반드시 아래의 JSON 구조로만 응답하고, 마크다운 태그(\`\`\`json) 등 추가 텍스트 없이 순수 JSON 문자열만 반환해.

      구조:
      {
        "position": "단기/스윙/장기 중 택 1",
        "action": "지정된 action 항목 중 택 1",
        "targetPrice": 숫자만 입력,
        "reason": "분석 근거 요약"
      }

      조건: 
      - 한국어 사용
      - "reason"은 최대한 전문 용어를 섞어 핵심만 전달
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    } else {
      text = text.replace(/```json|```/g, "").trim();
    }

    try {
      const jsonResponse = JSON.parse(text);
      
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
      }, { status: 200 });
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return NextResponse.json({ error: "분석 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
