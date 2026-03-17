import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// 허용된 도메인 리스트
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

export async function POST(req: Request) {
  // CORS 검증 로직 가동
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();
    const { symbol, name, price, changePercent, instruction } = body;

    if (!symbol || !name) {
      return NextResponse.json({ error: "분석에 필요한 종목 데이터(이름/티커)가 전송되지 않았습니다." }, { status: 200 });
    }

    // 통합된 환경변수명 사용
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다! 환경변수를 확인하세요." }, { status: 200 });
    }

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      cache: 'no-store'
    });

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

    const cleanText = resultText.replace(/[#*`]/g, '').trim();

    // 응답 헤더에 CORS 명시
    return NextResponse.json(
      { analysis: cleanText }, 
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      }
    );

  } catch (error: any) {
    console.error("SYSTEM CRITICAL ERROR IN ANALYZE:", error);
    return NextResponse.json({ error: `내부 시스템 장애: ${error.message || "알 수 없는 오류"}` }, { status: 200 });
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
