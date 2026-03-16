import webpush from 'web-push';
import { NextResponse } from 'next/server';

// VAPID 설정 (환경 변수 사용)
const vapidDetails = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: 'mailto:admin@aistock.com' // 알림 발송 주체 메일
};

webpush.setVapidDetails(
  vapidDetails.subject,
  vapidDetails.publicKey,
  vapidDetails.privateKey
);

export async function POST(request: Request) {
  try {
    const { subscription, title, body, url } = await request.json();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription missing" }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: title || "AI Stock 알림",
      body: body || "목표가 도달 알림입니다.",
      url: url || "/"
    });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true, message: "Push sent successfully" });
  } catch (error: any) {
    console.error("[Push API] Error:", error);
    return NextResponse.json({ error: "Push failed", detail: error.message }, { status: 500 });
  }
}
