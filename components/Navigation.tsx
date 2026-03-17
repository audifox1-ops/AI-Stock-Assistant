"use client";

import React from 'react';
import { Home, Star, Wallet, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
  const pathname = usePathname();

  const navItems = [
    { name: '홈', icon: Home, path: '/' },
    { name: '관심 종목', icon: Star, path: '/watchlist' },
    { name: '보유 종목', icon: Wallet, path: '/portfolio' },
    { name: '설정', icon: Settings, path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center z-[100] max-w-[430px] mx-auto h-16 pb-safe rounded-none">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.name}
            href={item.path}
            className={`flex-1 flex flex-col items-center justify-center h-full py-2 transition-all duration-300 relative group ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-none animate-in fade-in zoom-in-50 duration-300" />
            )}
            <div className={`mb-1 transition-all duration-300 ${
              isActive ? 'scale-110' : 'group-hover:text-slate-600'
            }`}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-black tracking-tighter uppercase transition-colors duration-300 ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default Navigation;
