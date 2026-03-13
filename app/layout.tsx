import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "AI STOCK - 개인 투자자를 위한 AI 주식 분석",
  description: "보유 종목 관리부터 실시간 수급 알림, AI의 전문적인 투자 전략까지 하나로.",
};

export const viewport: Viewport = {
  themeColor: "#050a1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-navy-950 selection:bg-accent-primary/30">
        <main className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-navy-950">
          {children}
          <Navigation />
        </main>
      </body>
    </html>
  );
}
