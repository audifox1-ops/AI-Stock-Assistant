import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, instruction } = body;

    // 1. 데이터 부족 검사
    if (!symbol || !name) {
      return NextResponse.json({ error: "분석에 필요한 종목 데이터(이름/티커)가 전송되지 않았습니다." }, { status: 200 });
    }

    // 2. API 키 명시적 검사
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "API 키가 Vercel에 없습니다! 환경설정을 확인하세요." }, { status: 200 });
    }

    // [강제 지침 적용] 마크다운 금지 및 3문단 요약 프롬프트 강화
    // 사용자가 보낸 instruction이 있으면 이를 최우선으로 반영
    const baseInstruction = instruction || "현재 데이터(현재가, 변동률)를 바탕으로 이 종목의 기술적 흐름과 향후 전망을 분석해.";

    const prompt = `
      당신은 전문 주식 분석가입니다. [${name} (${symbol})]의 현재가 ${price}원, 변동률 ${changePercent}% 지표를 참고하세요.
      
      [분석 지시사항]
      ${baseInstruction}
      
      [필수 제약 조건]
      1. 절대 마크다운 특수기호(#, *, -, 등)를 사용하지 마세요. 오직 일반 텍스트만 사용하세요.
      2. 반드시 읽기 쉽게 딱 3개의 짧은 문단으로만 요약하세요.
      3. 문단 사이에는 줄바꿈(\\n)을 두 번 넣어 확실히 구분하세요.
      4. 모바일 앱 화면이므로 문장을 짧고 간결하게 작성하세요.
    `;

    // 3. 최신 모델 엔드포인트 호출
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      cache: 'no-store'
    });

    // 4. 통신 실패 시 원본 에러 포착
    if (!response.ok) {
      const errText = await response.text();
      console.error("GOOGLE API RAW ERROR:", errText);
      return NextResponse.json({ error: `구글 서버 에러: ${errText}` }, { status: 200 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return NextResponse.json({ error: "분석 내용을 생성하지 못했습니다. (Empty Response)" }, { status: 200 });
    }

    // 마크다운 흔적을 한 번 더 제거하는 가드 로직 (만약 AI가 실수할 경우 대비)
    const cleanText = resultText.replace(/[#*`]/g, '').trim();

    return NextResponse.json({ analysis: cleanText }, { status: 200 });

  } catch (error: any) {
    console.error("SYSTEM CRITICAL ERROR IN ANALYZE:", error);
    return NextResponse.json({ error: `내부 시스템 장애: ${error.message || "알 수 없는 오류"}` }, { status: 200 });
  }
}
