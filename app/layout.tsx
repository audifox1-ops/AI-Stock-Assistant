import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Link from "next/link";
import { Home, Star, BarChart2, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Stock - 지능형 주식 분석 및 관리",
  description: "AI를 활용한 실시간 주식 포트폴리오 관리 및 분석 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased bg-gray-50/30`}>
        <AuthProvider>
          <main className="min-h-screen relative">
            {children}
          </main>

          {/* 하단 네비게이션 바 - 복원 완료 */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 pb-8 md:pb-4 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
            <div className="max-w-xl mx-auto flex justify-around items-center">
              <Link href="/" className="flex flex-col items-center gap-1 text-[#3182f6] transition-all">
                <Home size={24} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-tighter">홈</span>
              </Link>
              <Link href="/interest" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-900 transition-all">
                <Star size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">관심</span>
              </Link>
              <Link href="/chart" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-900 transition-all">
                <BarChart2 size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">차트</span>
              </Link>
              <Link href="/settings" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-900 transition-all">
                <Settings size={24} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">설정</span>
              </Link>
            </div>
          </nav>
        </AuthProvider>
      </body>
    </html>
  );
}
