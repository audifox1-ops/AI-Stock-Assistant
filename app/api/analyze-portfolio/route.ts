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

    // 포트폴리오 데이터를 문자열로 가공
    const portfolioDataString = portfolio.map((h: any) => 
      `- 종목명: ${h.stock_name}, 평단가: ${h.avg_buy_price}원, 현재가: ${h.last_price || h.avg_buy_price}원, 보유수량: ${h.quantity}주, 투자포지션: ${h.position || '미분류'}`
    ).join('\n');

    // 사용자 요청 전용 프롬프트 구성
    const prompt = `너는 월스트리트 최고의 AI 펀드매니저야. 아래 사용자의 보유 종목과 평단가, 현재가 데이터를 바탕으로 다음 4가지를 명확하게 분석해 줘.

데이터:
${portfolioDataString}

1. 보유종목 성향 분류: 각 종목이 단기/스윙/장기 투자 중 어디에 적합한지 펀더멘털과 변동성을 바탕으로 분류할 것.
2. 매매 타이밍: 사용자의 '평단가' 대비 '현재가'의 수익률을 계산하여, 지금이 추매(물타기), 손절, 혹은 홀딩할 타이밍인지 목표가와 함께 구체적으로 제시할 것.
3. 수급 및 차트 진단: 최근 한국 증시의 전반적인 외국인/기관 수급 동향과 섹터 흐름을 반영하여 차트상 현재 위치가 바닥권인지 상투인지 분석할 것.
4. 출력 형식: 마크다운 기호를 쓰지 말고, 모바일에서 읽기 편하게 종목별로 3~4줄 이내로 깔끔하게 요약할 것.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ diagnosis: text });
  } catch (error: any) {
    console.error("Portfolio AI Analysis Error:", error);
    return NextResponse.json({ error: "AI 진단 중 오류가 발생했습니다." }, { status: 500 });
  }
}
