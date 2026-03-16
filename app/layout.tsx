import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI-Stock Assistant | Smart Portfolio Analysis",
  description: "실시간 주가 수집 및 Gemini AI 기반 투자 전략 자동 생성 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-200 antialiased`}>
        <AuthProvider>
          {/* 모바일 고정 레이아웃 강제 적용: PC에서도 430px 중앙 정렬 */}
          <div className="max-w-[430px] mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden flex flex-col pb-20">
            <main className="flex-1 w-full">
              {children}
            </main>
            {/* 하단 네비게이션이 컨테이너 내부에 고정되도록 설정 */}
            <Navigation />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
