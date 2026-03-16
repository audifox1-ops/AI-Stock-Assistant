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
  BellRing,
  ShieldCheck,
  Zap,
  ArrowRight
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
        if (Notification.permission !== 'granted' && savedAlert) {
           setIsSupplyAlertEnabled(false);
           localStorage.setItem('supplyAlertEnabled', 'false');
        }
      }
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // 수급 알림 모니터링 엔진 (실시간 연동 시뮬레이션)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSupplyAlertEnabled) {
      // 5분마다 수급 체크 API 호출 (캐시 방지 강제 적용)
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/supply', { cache: 'no-store' });
          const data = await res.json();
          
          if (data.alertTriggered) {
             new Notification("🚀 AI 수급 포착!", {
                body: `기관/외인이 [${data.stock || '태웅'}]을 강력 매집 중입니다!`,
                icon: "/favicon.ico"
             });
          }
        } catch (err) { console.error("[Alert Engine] Processing Error:", err); }
      }, 300000); // 5분
    }
    return () => clearInterval(interval);
  }, [isSupplyAlertEnabled]);

  // 수급 알림 토글 핸들러
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
      alert(nextState ? '실시간 수급 모니터링 서비스를 시작합니다.' : '알림 서비스를 중단했습니다.');
    }
  };

  const handleThemeToggle = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = () => {
    if (confirm('AI Stock에서 안전하게 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* 1. Header - Strict design system, No rounded-full */}
      <header className="px-6 pt-20 pb-16 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gray-50/50 rounded-bl-[200px] -z-10" />
        
        <div className="flex justify-between items-center mb-12 px-2 relative z-10">
           <div>
              <h1 className="text-4xl font-black text-[#191f28] tracking-tighter">서비스 엔진 설정</h1>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] mt-2">Manage your AI intelligence environment</p>
           </div>
           <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3182f6] shadow-xl shadow-blue-50/20">
              <Settings size={36} className="animate-spin-slow" />
           </div>
        </div>
        
        {/* User Card - Squared, No rounded-full */}
        <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm relative z-10 flex items-center gap-8 group hover:border-[#3182f6] transition-all">
           <div className="relative">
             {session?.user?.image ? (
               <img src={session.user.image} alt="profile" className="w-20 h-20 rounded-2xl border-4 border-gray-50 shadow-sm" />
             ) : (
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 border-4 border-white">
                  <BarChart3 size={40} />
               </div>
             )}
             <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#3182f6] rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                <ShieldCheck size={18} className="text-white" />
             </div>
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-2xl font-black text-[#191f28] truncate">{session?.user?.name || 'VVIP 투자자'}</h2>
                 <span className="text-[10px] font-black bg-[#191f28] text-white px-2 py-1 rounded-lg">GOLD</span>
              </div>
              <p className="text-[11px] font-bold text-gray-400 truncate uppercase tracking-widest">{session?.user?.email || 'Engine Connectivity: Secure'}</p>
           </div>
        </div>
      </header>

      {/* Nav Content */}
      <div className="mt-12 px-6 space-y-10 max-w-xl mx-auto">
        
        {/* 1. App Control Section - No rounded-full */}
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <div className="flex items-center gap-2">
                 <Zap size={14} className="text-[#3182f6]" />
                 <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Platform Core Controls</span>
              </div>
              <Smartphone size={18} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* AI Alert Toggle */}
              <div className="px-10 py-10 flex items-center justify-between group">
                 <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'} rounded-2xl flex items-center justify-center text-white transition-all shadow-xl ${isSupplyAlertEnabled ? 'shadow-blue-100' : ''}`}>
                       <BellRing size={26} className={isSupplyAlertEnabled ? 'animate-bounce' : ''} />
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-lg font-black text-[#191f28]">실시간 수급 변동 알림</span>
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Smart Push Notification</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleSupplyAlertToggle}
                   className={`w-16 h-9 rounded-[1.2rem] p-1.5 transition-all duration-300 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-lg shadow-lg transition-all duration-300 transform ${isSupplyAlertEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                 </button>
              </div>

              {/* Theme Toggle */}
              <div className="px-10 py-10 flex items-center justify-between group">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-[#3182f6] transition-colors">
                       {isDarkMode ? <Moon size={26} /> : <Sun size={26} className="text-amber-500" />}
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-lg font-black text-[#191f28]">다크 모드 인터페이스</span>
                       <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">System appearance toggle</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleThemeToggle}
                   className={`w-16 h-9 rounded-[1.2rem] p-1.5 transition-all duration-300 ${isDarkMode ? 'bg-[#191f28]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-lg shadow-lg transition-all duration-300 transform ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`} />
                 </button>
              </div>
           </div>
        </div>

        {/* 2. Security Section - No rounded-full */}
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
           <div 
             onClick={handleSignOut}
             className="px-10 py-10 flex items-center justify-between hover:bg-red-50 group cursor-pointer transition-all"
           >
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-[#EF4444] group-hover:text-white transition-all shadow-sm">
                    <LogOut size={26} />
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-lg font-black text-[#EF4444]">안전한 로그아웃</span>
                    <span className="text-[10px] font-black text-red-300 uppercase tracking-widest leading-none">Exit current session</span>
                 </div>
              </div>
              <ChevronRight size={24} className="text-red-100" />
           </div>
        </div>

        {/* 3. Information Section - No rounded-full */}
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="divide-y divide-gray-50">
              <div onClick={() => alert('프리미엄 서버 가입이 필요합니다.')} className="px-10 py-8 flex items-center justify-between hover:bg-emerald-50/30 transition-all cursor-pointer group">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100">
                       <Zap size={22} />
                    </div>
                    <span className="text-base font-black text-[#191f28]">프리미엄 기능 업그레이드</span>
                 </div>
                 <ArrowRight size={20} className="text-emerald-200 group-hover:translate-x-2 transition-transform" />
              </div>
              <div className="px-10 py-8 flex items-center justify-between bg-gray-50/10">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                       <Info size={22} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-base font-black text-[#191f28]">시스템 버전 정보</span>
                       <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">v1.8.2-Gold Premium-X</span>
                    </div>
                 </div>
                 <span className="text-[10px] font-black text-[#3182f6] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">ALPHA READY</span>
              </div>
           </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-32 text-center px-12 pb-24 opacity-10">
         <div className="flex justify-center items-center gap-4 mb-3">
            <BarChart3 className="text-gray-900" size={36} />
            <span className="text-3xl font-black tracking-tighter text-gray-900 uppercase">AI STOCK Systems</span>
         </div>
         <p className="text-[10px] font-black text-gray-500 uppercase tracking-[1.2em]">Engineered for Superior Gains © 2026</p>
      </footer>
    </div>
  );
}
