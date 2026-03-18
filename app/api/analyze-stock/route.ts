import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * [ai-analyst] 역할:
 * - 지표 데이터를 기반으로 투자자가 즉시 행동할 수 있는 날카로운 인사이트를 도출합니다.
 * - 결과물은 항상 전문 금융 용어를 섞은 애널리스트 톤으로 작성합니다.
 * - 마크다운 형식을 활용하여 [밸류에이션], [모멘텀], [AI 종합 의견] 3단 구조로 출력합니다.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { stockInfo } = await req.json();

    if (!stockInfo) {
      return NextResponse.json({ error: "분석할 종목 데이터가 없습니다." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    /**
     * [ai-analyst] Context-Rich Prompting:
     * - 넘겨받은 모든 지표를 마크다운 테이블로 정리하여 LLM에 주입합니다.
     * - [밸류에이션], [수급 및 모멘텀], [🤖 AI 종합 투자 의견] 3단계 구조를 강제합니다.
     */
    const prompt = `당신은 골드만삭스 수석 퀀트 애널리스트입니다. 
제공된 데이터를 정밀 분석하여 투자 전략 리포트를 마크다운 형식으로 작성하세요.

### [종목 기본 데이터]
| 지표명 | 데이터 |
| :--- | :--- |
| 종목명 | ${stockInfo.stockName} (${stockInfo.ticker}) |
| 현재가 | ${Number(stockInfo.price).toLocaleString()}원 |
| 52주 최고/최저 | ${Number(stockInfo.high52w).toLocaleString()} / ${Number(stockInfo.low52w).toLocaleString()} |
| 증권사 목표가 | ${Number(stockInfo.targetPrice).toLocaleString()}원 |
| PER / PBR | ${stockInfo.per} / ${stockInfo.pbr} |
| 시가총액 | ${Number(stockInfo.marketCap).toLocaleString()}억원 |

---

### [분석 가이드라인]
1. **[1. 현재 밸류에이션 평가]**: PER, PBR 및 목표가 괴리율을 분석하세요. 현재 가격이 밸류에이션 측면에서 저평가 국면인지, 혹은 프리미엄이 과도한지 서술하세요.
2. **[2. 수급 및 모멘텀]**: 52주 고점 대비 하락폭과 최근 가격 추이를 통해 기술적 반등 가능성이나 추세 강화 여부를 진단하세요.
3. **[3. 🤖 AI 종합 투자 의견]**: 매수(Buy), 관망(Hold), 매도(Sell) 중 하나를 선택하고, 그 이유를 '단기적 관점'과 '중기적 관점'에서 날카롭게 요약하세요.

### [주의 사항]
- 어조: 매우 냉철하고 전문적인 애널리스트 톤을 유지할 것.
- 형식: 반드시 위 3가지 섹션으로 나누어 마크다운으로 작성할 것.
- 언어: 한국어로 상세하게 작성할 것.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json(
      { analysis: text },
      {
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      }
    );
  } catch (error: any) {
    console.error("[AI-Analyst] Analysis Error:", error);
    return NextResponse.json({ error: "AI 분석 리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
