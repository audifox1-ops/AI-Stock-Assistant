import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { NotificationProvider } from "@/context/NotificationContext";

export const metadata: Metadata = {
  title: "AI Stock Assistant",
  description: "실시간 주가 감시 및 AI 투자 분석 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 selection:bg-[#3182f6]/20 text-[#191f28] antialiased">
        <NotificationProvider>
          {/* 토스 스타일의 깔끔한 모바일 컨테이너 */}
          <main className="max-w-md mx-auto min-h-screen relative bg-white shadow-[0_0_50px_rgba(0,0,0,0.02)]">
            {children}
            <Navigation />
          </main>
        </NotificationProvider>
      </body>
    </html>
  );
}
