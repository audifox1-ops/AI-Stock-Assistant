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
    { href: "/analysis", icon: LineChart, label: "차트" },
    { href: "/settings", icon: Settings, label: "설정" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-md">
      <div className="flex justify-around items-center bg-slate-900/80 border border-white/10 rounded-3xl h-16 px-2 shadow-2xl">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link 
              key={href} 
              href={href} 
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 ${
                isActive ? "text-blue-500 scale-110" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : ""}`}>
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
