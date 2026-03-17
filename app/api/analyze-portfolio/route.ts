import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
  try {
    const { portfolio } = await req.json();

    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
      return NextResponse.json({ error: "분석할 데이터가 없습니다." }, { status: 400 });
    }

    // 포트폴리오 데이터를 문자열로 가공 (목표가/손절가 포함)
    const portfolioDataString = portfolio.map((h: any) => 
      `- 종목명: ${h.stockName}, 평단가: ${h.avgPrice}원, 현재가: ${h.currentPrice}원, 목표가: ${h.targetPrice || 0}원, 손절가: ${h.stopLossPrice || 0}원, 보유수량: ${h.quantity}주, 투자포지션: ${h.position || '미분류'}`
    ).join('\n');

    // 기계적 매매 지침을 강화한 프롬프트 구성
    const prompt = `너는 감정을 배제하고 오직 확률과 원칙에만 근거해 매매하는 전설적인 퀀트 트레이더이자 AI 펀드매니저야. 
아래 사용자의 보유 종목 데이터를 바탕으로 '기계적 매매 지침'을 최우선으로 하여 정밀 분석을 수행해.

데이터:
${portfolioDataString}

[필수 분석 및 지시 사항]
1. 매매 액션 아이템 (최우선): 각 종목의 '현재가'를 사용자가 설정한 '목표가', '손절가'와 비교해라. 
   - 목표가에 도달했거나 상회했다면: "전량 익절" 또는 "비중 50% 분할 매도"라는 명확한 행동 지침(Action Item)을 1순위로 제시해.
   - 손절가에 도달했거나 하회했다면: 펀더멘털이나 미련에 관계없이 "기계적 손절" 또는 "즉시 비중 축소"를 강력하게 권고해.
   - 두 지점 사이에 있다면: 목표가까지의 남은 거리와 손절가까지의 안전 마진을 계산하여 브리핑해.

2. 포지션별 전략 진단: 사용자가 설정한 투자 포지션(단기/스윙/장기)에 현재의 흐름이 부합하는지 진단해.

3. 섹터 및 수급 흐름: 최근 한국 증시 및 해당 섹터의 외국인/기관 수급 흐름을 반영하여 향후 대응 전략을 보강해.

4. 출력 형식: 
   - 마크다운 기호를 쓰지 마라.
   - 종목별로 명확한 [결론: 매도/보유/손절]을 먼저 적고, 그 이유를 2~3줄로 설명해.
   - 모바일에서 읽기 편하게 군더더기 없이 깔끔하게 요약할 것.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ diagnosis: text });
  } catch (error: any) {
    console.error("Portfolio AI Analysis Error:", error);
    return NextResponse.json({ error: "AI 진단 중 오류가 발생했습니다." }, { status: 500 });
  }
}
