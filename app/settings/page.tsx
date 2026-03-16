"use client";

import React, { useState, useEffect } from 'react';
import { signOut, useSession } from "next-auth/react";
import { 
  LogOut, 
  Bell, 
  ChevronRight, 
  Smartphone, 
  Info,
  CircleCheck,
  Settings,
  Moon,
  Sun,
  BarChart3,
  BellRing
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isSupplyAlertEnabled, setIsSupplyAlertEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 초기 상태 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAlert = localStorage.getItem('supplyAlertEnabled') === 'true';
      setIsSupplyAlertEnabled(savedAlert);
      
      if ('Notification' in window) {
        // 실제 시스템 권한 체크
        if (Notification.permission !== 'granted' && savedAlert) {
           setIsSupplyAlertEnabled(false);
           localStorage.setItem('supplyAlertEnabled', 'false');
        }
      }
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // 수급 알림 모니터링 엔진 (실제 실무형 시뮬레이션 로직)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSupplyAlertEnabled) {
      // 5분마다 수급 체크 API 호출 시뮬레이션
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/supply', { cache: 'no-store' });
          const data = await res.json();
          
          if (data.alertTriggered) {
             new Notification("🚀 AI 수급 포착!", {
                body: `기관이 [${data.topStock || '태웅'}]을 대량 매집 중입니다! 즉시 확인하세요.`,
                icon: "/favicon.ico"
             });
          }
        } catch (err) { console.error("Alert Engine Error:", err); }
      }, 300000); // 5분
    }
    return () => clearInterval(interval);
  }, [isSupplyAlertEnabled]);

  // 수급 알림 토글 핸들러 (실제 연결)
  const handleSupplyAlertToggle = async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const nextState = !isSupplyAlertEnabled;
        setIsSupplyAlertEnabled(nextState);
        localStorage.setItem('supplyAlertEnabled', String(nextState));
        if (nextState) alert('실시간 수급 모니터링 알림이 활성화되었습니다!');
      } else {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.');
      }
    } else {
      const nextState = !isSupplyAlertEnabled;
      setIsSupplyAlertEnabled(nextState);
      localStorage.setItem('supplyAlertEnabled', String(nextState));
      alert(nextState ? '실시간 수급 모니터링을 시작합니다.' : '알림 서비스를 일시 중단했습니다.');
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
    if (confirm('AI Stock에서 안전하게 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Settings Header */}
      <header className="px-6 pt-16 pb-12 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-10 px-2 relative z-10">
           <h1 className="text-3xl font-black text-[#191f28] tracking-tight">서비스 설정</h1>
           <Settings className="text-[#3182f6] opacity-10 animate-spin-slow" size={32} />
        </div>
        
        {/* User Card (Squared Card) */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative z-10 flex items-center gap-6 group hover:translate-y-[-2px] transition-all">
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
              <h2 className="text-xl font-bold text-[#191f28] truncate mb-0.5">{session?.user?.name || '프리미엄 투자자'}</h2>
              <p className="text-[11px] font-bold text-gray-400 truncate uppercase tracking-widest">{session?.user?.email || 'Advanced Analytics Active'}</p>
           </div>
        </div>
      </header>

      {/* Nav Content */}
      <div className="mt-10 px-6 space-y-8">
        
        {/* 1. App Control Section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">실시간 모니터링 제어</span>
              <Smartphone size={16} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* AI Alert Toggle */}
              <div className="px-8 py-7 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'} rounded-xl flex items-center justify-center text-white transition-all shadow-md ${isSupplyAlertEnabled ? 'shadow-blue-100' : ''}`}>
                       <BellRing size={22} className={isSupplyAlertEnabled ? 'animate-bounce' : ''} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-base font-bold text-[#191f28]">전문가 수급 알림</span>
                       <span className="text-[10px] font-bold text-blue-400 mt-0.5 uppercase tracking-widest">Institutional Flow Alert</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleSupplyAlertToggle}
                   className={`w-14 h-8 rounded-xl p-1 transition-all duration-300 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-lg shadow-md transition-all duration-300 transform ${isSupplyAlertEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              {/* Theme Toggle */}
              <div className="px-8 py-7 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                       {isDarkMode ? <Moon size={22} className="text-[#3182f6]" /> : <Sun size={22} className="text-amber-500" />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-base font-bold text-[#191f28]">다크 모드 설정</span>
                       <span className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-widest">Interface Appearance</span>
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
                 <span className="text-base font-bold text-red-500">안전 로그아웃</span>
              </div>
              <ChevronRight size={20} className="text-red-200" />
           </div>
        </div>

        {/* 3. Support Section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
           <div className="divide-y divide-gray-50">
              <div onClick={() => alert('프리미엄 회원 전용 기능입니다.')} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer">
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                       <Smartphone size={20} />
                    </div>
                    <span className="text-sm font-bold text-[#191f28]">모바일 알림 설정</span>
                 </div>
                 <ChevronRight size={18} className="text-gray-200" />
              </div>
              <div className="px-8 py-6 flex items-center justify-between bg-gray-50/10">
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                       <Info size={20} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-[#191f28]">버전 정보</span>
                       <span className="text-[9px] font-bold text-gray-300">v1.7.0-Advanced (Gold)</span>
                    </div>
                 </div>
                 <span className="text-[9px] font-bold text-[#3182f6] bg-blue-50 px-2 py-0.5 rounded-md">NEW</span>
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
         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.4em]">Engineered for Alpha v1.7</p>
      </footer>
    </div>
  );
}
