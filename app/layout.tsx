import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Link from "next/link";
import { Home, Star, BarChart2, User, Bell } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Stock - 토스 증권 스타일의 모던 자산 관리",
  description: "AI를 활용한 실시간 주식 포트폴리오 관리 및 분석 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased bg-gray-50 text-[#111827]`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col font-sans">
            {/* Main Content Wrapper */}
            <main className="flex-1 relative pb-24">
              {children}
            </main>

            {/* Tosh-style Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-100/50 safe-area-bottom">
              <div className="max-w-xl mx-auto flex justify-around items-center h-20 px-2">
                <Link href="/" className="flex flex-col items-center justify-center gap-1.5 w-full group">
                  <div className="p-1 rounded-xl group-active:scale-90 transition-transform">
                    <Home size={26} strokeWidth={2.5} className="text-[#3182f6]" />
                  </div>
                  <span className="text-[11px] font-black text-[#3182f6]">홈</span>
                </Link>
                
                <Link href="/interest" className="flex flex-col items-center justify-center gap-1.5 w-full group">
                  <div className="p-1 rounded-xl group-active:scale-90 transition-transform">
                    <Star size={26} strokeWidth={2} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">관심</span>
                </Link>

                <Link href="/chart" className="flex flex-col items-center justify-center gap-1.5 w-full group">
                  <div className="p-1 rounded-xl group-active:scale-90 transition-transform">
                    <BarChart2 size={26} strokeWidth={2} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">차트</span>
                </Link>

                <Link href="/settings" className="flex flex-col items-center justify-center gap-1.5 w-full group">
                  <div className="p-1 rounded-xl group-active:scale-90 transition-transform">
                    <User size={26} strokeWidth={2} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">정보</span>
                </Link>
              </div>
            </nav>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
