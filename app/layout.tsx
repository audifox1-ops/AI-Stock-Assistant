"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, BarChart2, User } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

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

            {/* Tosh-style Bottom Navigation (Client Component logic inside) */}
            <Navigation />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

function Navigation() {
  const pathname = usePathname();

  const getTabStyle = (path: string) => {
    const isActive = pathname === path;
    return {
      container: `flex flex-col items-center justify-center gap-1.5 w-full group transition-all`,
      iconColor: isActive ? "text-[#3182f6]" : "text-gray-300 group-hover:text-gray-500",
      textColor: isActive ? "text-[#3182f6] font-black" : "text-gray-400 font-bold",
      stroke: isActive ? 2.5 : 2
    };
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-100/50 safe-area-bottom shadow-[0_0_20px_rgba(0,0,0,0.02)]">
      <div className="max-w-xl mx-auto flex justify-around items-center h-20 px-2">
        <Link href="/" className={getTabStyle("/").container}>
          <Home size={26} strokeWidth={getTabStyle("/").stroke} className={getTabStyle("/").iconColor} />
          <span className={`text-[11px] ${getTabStyle("/").textColor}`}>홈</span>
        </Link>
        
        <Link href="/interest" className={getTabStyle("/interest").container}>
          <Star size={26} strokeWidth={getTabStyle("/interest").stroke} className={getTabStyle("/interest").iconColor} />
          <span className={`text-[11px] ${getTabStyle("/interest").textColor}`}>관심</span>
        </Link>

        <Link href="/chart" className={getTabStyle("/chart").container}>
          <BarChart2 size={26} strokeWidth={getTabStyle("/chart").stroke} className={getTabStyle("/chart").iconColor} />
          <span className={`text-[11px] ${getTabStyle("/chart").textColor}`}>차트</span>
        </Link>

        <Link href="/settings" className={getTabStyle("/settings").container}>
          <User size={26} strokeWidth={getTabStyle("/settings").stroke} className={getTabStyle("/settings").iconColor} />
          <span className={`text-[11px] ${getTabStyle("/settings").textColor}`}>설정</span>
        </Link>
      </div>
    </nav>
  );
}
