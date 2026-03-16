"use client";

import React, { useState, useEffect } from 'react';
import { signOut, useSession } from "next-auth/react";
import { 
  LogOut, 
  Bell, 
  ChevronRight, 
  ShieldCheck, 
  Smartphone, 
  Info,
  CircleCheck,
  CreditCard,
  Target,
  MessageCircle,
  Settings,
  BellRing,
  ExternalLink,
  Moon,
  Sun,
  BarChart3
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isSupplyAlertEnabled, setIsSupplyAlertEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 초기 상태 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setIsSupplyAlertEnabled(Notification.permission === 'granted');
      }
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // 수급 및 AI 알림 토글 핸들러
  const handleSupplyAlertToggle = async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsSupplyAlertEnabled(true);
        alert('AI 실시간 분석 및 수급 알림이 활성화되었습니다!');
      } else {
        alert('알림 권한이 거부되었습니다.');
      }
    } else {
      const nextState = !isSupplyAlertEnabled;
      setIsSupplyAlertEnabled(nextState);
      alert(nextState ? '알림 서비스를 켰습니다.' : '알림 서비스를 일시 중단했습니다.');
    }
  };

  // 테마 변경 핸들러
  const handleThemeToggle = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 로그아웃 핸들러
  const handleSignOut = () => {
    if (confirm('AI Stock에서 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  const handleMenuClick = (menuLabel: string) => {
    alert(`'${menuLabel}' 기능은 프리미엄 업데이트 준비 중입니다.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Settings Header */}
      <header className="px-6 pt-16 pb-12 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-10 px-2 relative z-10">
           <h1 className="text-3xl font-black text-[#191f28] tracking-tight">설정</h1>
           <Settings className="text-[#3182f6] opacity-10" size={32} />
        </div>
        
        {/* User Card (Squared Card) */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative z-10 flex items-center gap-6">
           <div className="relative">
             {session?.user?.image ? (
               <img src={session.user.image} alt="profile" className="w-16 h-16 rounded-xl border border-gray-100 shadow-sm" />
             ) : (
               <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-[#3182f6]">
                  <Settings size={32} />
               </div>
             )}
             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-md border-2 border-white">
                <CircleCheck size={14} className="text-white" />
             </div>
           </div>
           <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[#191f28] truncate mb-0.5">{session?.user?.name || '사용자'}</h2>
              <p className="text-xs font-medium text-gray-400 truncate">{session?.user?.email || 'Premium Membership'}</p>
           </div>
        </div>
      </header>

      {/* Nav Content */}
      <div className="mt-10 px-6 space-y-8">
        
        {/* 1. App Control Section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">환경 설정</span>
              <Smartphone size={16} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* AI Alert Toggle */}
              <div className="px-8 py-7 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'} rounded-xl flex items-center justify-center text-white transition-all`}>
                       <Bell size={22} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-base font-bold text-[#191f28]">실시간 수급 알림</span>
                       <span className="text-[10px] font-bold text-blue-400 mt-0.5 uppercase tracking-widest">Active Monitoring</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleSupplyAlertToggle}
                   className={`w-14 h-8 rounded-xl p-1 transition-all duration-300 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-lg shadow-sm transition-all duration-300 transform ${isSupplyAlertEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              {/* Theme Toggle */}
              <div className="px-8 py-7 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                       {isDarkMode ? <Moon size={22} /> : <Sun size={22} className="text-amber-500" />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-base font-bold text-[#191f28]">다크 모드</span>
                       <span className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-widest">Interface Theme</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleThemeToggle}
                   className={`w-14 h-8 rounded-xl p-1 transition-all duration-300 ${isDarkMode ? 'bg-[#191f28]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-lg shadow-sm transition-all duration-300 transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>
           </div>
        </div>

        {/* 2. Security Section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
           <div 
             onClick={handleSignOut}
             className="px-8 py-7 flex items-center justify-between hover:bg-red-50 group cursor-pointer transition-all"
           >
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                    <LogOut size={22} />
                 </div>
                 <span className="text-base font-bold text-red-500">로그아웃</span>
              </div>
              <ChevronRight size={20} className="text-red-200" />
           </div>
        </div>

        {/* 3. Support Section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
           <div className="divide-y divide-gray-50">
              <div onClick={() => handleMenuClick('1:1 전문가 상담')} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer">
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                       <MessageCircle size={20} />
                    </div>
                    <span className="text-sm font-bold text-[#191f28]">전문가 1:1 상담</span>
                 </div>
                 <ChevronRight size={18} className="text-gray-200" />
              </div>
              <div onClick={() => handleMenuClick('데이터 출처 공시')} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group">
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#3182f6] transition-colors">
                       <Info size={20} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-[#191f28]">서비스 정보</span>
                       <span className="text-[9px] font-bold text-gray-300">v1.6.0-Clean</span>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-gray-200" />
              </div>
           </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-20 text-center px-10 pb-20 opacity-20">
         <div className="flex justify-center items-center gap-2 mb-2">
            <BarChart3 className="text-gray-900" size={24} />
            <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">AI STOCK</span>
         </div>
         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.4em]">Professional Analytics v1.6</p>
      </footer>
    </div>
  );
}
