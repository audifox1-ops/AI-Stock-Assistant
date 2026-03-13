import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { NotificationProvider } from "@/context/NotificationContext";

export const metadata: Metadata = {
  title: "AI STOCK - 개인 투자자를 위한 AI 주식 분석",
  description: "보유 종목 관리부터 실시간 수급 알림, AI의 전문적인 투자 전략까지 하나로.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
    <html lang="ko">
      <body className="bg-gray-50 selection:bg-blue-500/20 text-gray-900">
        <NotificationProvider>
          <main className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-gray-50 border-x border-gray-200">
            {children}
            <Navigation />
          </main>
        </NotificationProvider>
      </body>
    </html>
  );
}
