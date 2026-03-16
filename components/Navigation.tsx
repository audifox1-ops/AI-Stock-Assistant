"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Bell, 
  LineChart, 
  Settings 
} from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/watchlist", icon: Bell, label: "관심" }, // 경로 확인 후 수정 (/interest -> /watchlist)
    { href: "/chart", icon: LineChart, label: "차트" },
    { href: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    /* 컨테이너 바닥에 고정되도록 absolute w-full 적용 (레이아웃 상 부모가 relative) */
    <nav className="absolute bottom-0 left-0 right-0 z-50 flex justify-center bg-white/90 backdrop-blur-md border-t border-gray-100">
      <div className="w-full flex justify-around items-center h-16 px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link 
              key={href} 
              href={href} 
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-200 ${
                isActive ? "text-[#3182f6]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}
              />
              <span className={`text-[10px] mt-0.5 font-bold ${isActive ? "opacity-100" : "opacity-80"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
