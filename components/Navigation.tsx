"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Star, 
  Wallet, 
  Settings 
} from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/watchlist", icon: Star, label: "관심" },
    { href: "/portfolio", icon: Wallet, label: "보유종목" },
    { href: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[100] flex justify-around items-center h-20 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 pb-2">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <Link 
            key={href} 
            href={href} 
            className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 ${
              isActive ? "text-blue-600 scale-105" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {/* [19차] Navigation 직각화: rounded-2xl 제거 및 rounded-none 적용 */}
            <div className={`p-2 transition-all duration-300 rounded-none ${isActive ? "bg-blue-50" : "bg-transparent"}`}>
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
            </div>
            <span className={`text-[10px] mt-1 font-black leading-none transition-all duration-300 ${isActive ? "opacity-100" : "opacity-60"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
