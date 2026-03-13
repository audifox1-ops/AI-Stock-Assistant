"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  LayoutDashboard, 
  Bell, 
  LineChart, 
  Settings 
} from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/interest", icon: Bell, label: "관심" },
    { href: "/chart", icon: LineChart, label: "차트" },
    { href: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-2 flex justify-around items-center h-16 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
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
              <span className={`text-[10px] mt-1 font-bold ${isActive ? "opacity-100" : "opacity-80"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
