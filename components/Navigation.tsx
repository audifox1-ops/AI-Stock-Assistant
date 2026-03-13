"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, LineChart, Settings, LayoutDashboard } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/home", icon: Home, label: "홈" },
    { href: "/", icon: LayoutDashboard, label: "보유종목" },
    { href: "/interest", icon: Bell, label: "관심종목" },
    { href: "/chart", icon: LineChart, label: "차트" },
    { href: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-gray-50/80 via-gray-50/40 to-transparent backdrop-blur-md">
      <div className="flex justify-around items-center bg-white/90 border border-gray-200 rounded-3xl h-16 px-2 shadow-xl">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link 
              key={href} 
              href={href} 
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 ${
                isActive ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-blue-50 text-blue-600 shadow-sm" : ""}`}>
                <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] mt-1 font-bold ${isActive ? "opacity-100" : "opacity-70"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
