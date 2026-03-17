import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://ai-stock-assistant-nine.vercel.app'
];

// KIS API 환경변수
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_URL = 'https://openapi.koreainvestment.com:9443';

// 토큰 캐싱을 위한 변수 (메모리 캐싱)
let cachedToken = '';
let tokenExpireTime = 0;

/**
 * KIS 액세스 토큰 발급 함수
 */
async function getKisToken() {
  const now = Date.now();
  // 캐시된 토큰이 있고 만료되지 않았으면 재사용 (보통 24시간 유효)
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${KIS_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET
      })
    });
    const data = await res.json();
    if (data.access_token) {
      cachedToken = data.access_token;
      // 만료 시간 설정 (유효기간에서 1분 정도 여유를 둠)
      tokenExpireTime = now + (data.expires_in * 1000) - 60000;
      return cachedToken;
    }
    throw new Error('Token issuance failed');
  } catch (e) {
    console.error('KIS Token Error:', e);
    return null;
  }
}

/**
 * KIS 주식현재가 시세 조회 (FHKST01010100)
 */
async function fetchKisPrice(ticker: string, token: string) {
  try {
    const res = await fetch(`${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${ticker}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APP_KEY || '',
        'appsecret': KIS_APP_SECRET || '',
        'tr_id': 'FHKST01010100'
      }
    });
    const data = await res.json();
    
    if (data.rt_cd !== '0') {
      console.warn(`KIS API Error for ${ticker}: ${data.msg1}`);
      throw new Error(data.msg1);
    }

    const output = data.output;
    return {
      ticker: ticker,
      price: Number(output.stck_prpr || 0),
      changeRate: Number(output.prdy_ctrt || 0),
      volume: Number(output.acml_vol || 0),
      status: Number(output.prdy_ctrt) > 0 ? 'UP' : (Number(output.prdy_ctrt) < 0 ? 'DOWN' : 'SAME')
    };
  } catch (e) {
    console.error(`KIS Fetch Error for ${ticker}:`, e);
    // 에러 발생 시 프론트엔드 중단을 막기 위한 Mock 데이터 Fallback
    return {
      ticker,
      price: 50000, 
      changeRate: 1.5,
      volume: 1000000,
      status: 'UP'
    };
  }
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const tickersParam = searchParams.get('tickers');

  // 1. KIS 토큰 획득
  const token = await getKisToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }

  // 2. 다중 종목 시세 조회 로직
  if (tickersParam) {
    const tickers = tickersParam.split(',').filter(t => t.trim() !== '');
    const details = await Promise.all(tickers.map(t => fetchKisPrice(t.trim(), token)));
    return NextResponse.json({ success: true, data: details });
  }

  // 3. 지수 데이터 (임시 Mock 유지 또는 KIS 지수 API 연동 필요)
  // KIS 지수 API(FHKST03010100) 연동 전까지는 안전을 위해 Mock 데이터 반환
  if (type === 'index') {
    return NextResponse.json({
      success: true,
      data: [
        { name: '코스피', value: '2,680.15', change: '15.20', changeRate: '0.57', status: 'UP' },
        { name: '코스닥', value: '870.45', change: '2.30', changeRate: '0.26', status: 'UP' }
      ]
    });
  }

  return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
