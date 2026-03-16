import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, institutional, foreigner } = body;

    // 1. 데이터 부족 검사
    if (!symbol || !name) {
      return NextResponse.json({ error: "분석에 필요한 종목 데이터(이름/티커)가 전송되지 않았습니다." }, { status: 200 });
    }

    // 2. API 키 명시적 검사 (사용자 지침: Vercel 환경변수 누락 시 명확히 고지)
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "API 키가 Vercel에 없습니다! 환경설정을 확인하세요." }, { status: 200 });
    }

    const prompt = `주식 분석가로서 [${name} (${symbol})]를 분석하세요. 현재가 ${price}, 변동 ${changePercent}%. 핵심 3줄 대응 전략을 작성하세요.`;

    // 3. [최적화 지침 반영] 공식 지원 안정 모델 gemini-2.5-flash로 엔드포인트 즉시 교체
    // 사용자가 제공한 정확한 URL 구조를 그대로 반영합니다.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      cache: 'no-store'
    });

    // 4. 통신 실패 시 원본 에러 포착 (프론트로 에러 텍스트 그대로 전달)
    if (!response.ok) {
      const errText = await response.text();
      console.error("GOOGLE API RAW ERROR (Gemini 2.5):", errText);
      return NextResponse.json({ error: `구글 서버 에러: ${errText}` }, { status: 200 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json({ error: "분석 내용을 생성하지 못했습니다. (Empty Response)" }, { status: 200 });
    }

    return NextResponse.json({ analysis: resultText }, { status: 200 });

  } catch (error: any) {
    console.error("SYSTEM CRITICAL ERROR IN ANALYZE:", error);
    return NextResponse.json({ error: `내부 시스템 장애: ${error.message || "알 수 없는 오류"}` }, { status: 200 });
  }
}
