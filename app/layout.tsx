import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider"; // 중괄호를 추가하여 명명된 임포트로 수정
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
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* Toss 스타일 최적화: 메인 영역에 하단 탭 여백(pb-24) 확보 */}
            <main className="flex-1 w-full max-w-[1200px] mx-auto pb-24">
              {children}
            </main>
            {/* 고정 네비게이션 */}
            <Navigation />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
