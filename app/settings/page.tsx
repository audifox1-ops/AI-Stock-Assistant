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
  Sun
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
    console.log('[Settings] Alert Toggle Clicked');
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
        alert('알림 권한이 거부되었습니다. 원활한 서비스를 위해 브라우저 설정에서 권한을 허용해주세요.');
      }
    } else {
      const nextState = !isSupplyAlertEnabled;
      setIsSupplyAlertEnabled(nextState);
      alert(nextState ? '알림 서비스를 켰습니다.' : '알림 서비스를 일시 중단했습니다.');
    }
  };

  // 테마 변경 핸들러 (실제 작동)
  const handleThemeToggle = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      alert('다크 모드가 적용되었습니다.');
    } else {
      document.documentElement.classList.remove('dark');
      alert('라이트 모드가 적용되었습니다.');
    }
  };

  // 로그아웃 핸들러 (실제 작동)
  const handleSignOut = () => {
    if (confirm('AI Stock에서 안전하게 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  // 기타 버튼 클릭 핸들러
  const handleMenuClick = (menuLabel: string) => {
    alert(`'${menuLabel}' 기능은 Gemini API와 연동된 고도화 작업 중입니다. 곧 만나보실 수 있습니다!`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
      {/* Settings Header */}
      <header className="px-6 pt-16 pb-14 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/30 rounded-full -mr-48 -mt-48 opacity-40 select-none pointer-events-none" />
        <div className="flex justify-between items-center mb-12 relative z-10 px-4">
           <h1 className="text-4xl font-black text-[#191f28] tracking-tight">서비스 설정</h1>
           <Settings className="text-[#3182f6] animate-spin-slow opacity-20" size={36} />
        </div>
        
        {/* User Card (Wide Card) */}
        <div className="bg-white p-9 rounded-[3rem] border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] relative z-10 group flex items-center gap-7 transition-all hover:translate-y-[-4px]">
           <div className="relative">
             {session?.user?.image ? (
               <img src={session.user.image} alt="profile" className="w-24 h-24 rounded-[2.5rem] border-4 border-white shadow-xl transition-transform group-hover:scale-105" />
             ) : (
               <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-[#3182f6]">
                  <Settings size={48} />
               </div>
             )}
             <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <CircleCheck size={18} className="text-white" />
             </div>
           </div>
           <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-[#191f28] truncate mb-1">{session?.user?.name || '관리자님'}</h2>
              <p className="text-sm font-bold text-gray-400 truncate tracking-tight px-1">{session?.user?.email || 'Premium Investor Status'}</p>
           </div>
        </div>
      </header>

      {/* Nav Content */}
      <div className="mt-14 px-6 space-y-10">
        
        {/* 1. App Control Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-7 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">Core Interface</span>
              <Smartphone size={20} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* AI Alert Toggle */}
              <div className="px-10 py-10 flex items-center justify-between">
                 <div className="flex items-center gap-7">
                    <div className={`w-14 h-14 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'} rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-50/20 transition-all`}>
                       <Bell size={26} className={isSupplyAlertEnabled ? 'animate-bounce' : ''} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-lg font-black text-[#191f28]">AI 수급 알림 서비스</span>
                       <span className="text-[11px] font-bold text-blue-400 mt-1 uppercase tracking-widest">Gemini Engine Sync</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleSupplyAlertToggle}
                   className={`w-18 h-10 rounded-full p-1.5 transition-all duration-500 shadow-inner ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-7 h-7 bg-white rounded-full shadow-2xl transition-all duration-500 transform ${isSupplyAlertEnabled ? 'translate-x-8' : 'translate-x-0'}`} />
                 </button>
              </div>

              {/* Theme Toggle */}
              <div className="px-10 py-10 flex items-center justify-between">
                 <div className="flex items-center gap-7">
                    <div className={`w-14 h-14 bg-gray-100 rounded-[1.5rem] flex items-center justify-center text-gray-400`}>
                       {isDarkMode ? <Moon size={26} className="text-[#3182f6]" /> : <Sun size={26} className="text-amber-500" />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-lg font-black text-[#191f28]">주식 모드 (다크)</span>
                       <span className="text-[11px] font-bold text-gray-300 mt-1 uppercase tracking-widest">Visual Preference</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleThemeToggle}
                   className={`w-18 h-10 rounded-full p-1.5 transition-all duration-500 shadow-inner ${isDarkMode ? 'bg-[#191f28]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-7 h-7 bg-white rounded-full shadow-2xl transition-all duration-500 transform ${isDarkMode ? 'translate-x-8' : 'translate-x-0'}`} />
                 </button>
              </div>
           </div>
        </div>

        {/* 2. Security Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-7 border-b border-gray-50 bg-gray-50/20">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">Privacy & Access</span>
           </div>
           <div 
             onClick={handleSignOut}
             className="px-10 py-10 flex items-center justify-between hover:bg-red-50 group cursor-pointer transition-all"
           >
              <div className="flex items-center gap-7">
                 <div className="w-14 h-14 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all shadow-sm">
                    <LogOut size={26} />
                 </div>
                 <span className="text-xl font-black text-red-500 tracking-tight">서비스 안전 로그아웃</span>
              </div>
              <ChevronRight size={26} className="text-red-200" />
           </div>
        </div>

        {/* 3. Support Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-7 border-b border-gray-50 bg-gray-50/20">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.4em]">Investor Support</span>
           </div>
           <div className="divide-y divide-gray-50">
              <div onClick={() => handleMenuClick('1:1 전문가 상담')} className="px-10 py-9 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group">
                 <div className="flex items-center gap-7">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                       <MessageCircle size={24} />
                    </div>
                    <span className="text-lg font-black text-[#191f28]">전문가 1:1 채팅</span>
                 </div>
                 <ChevronRight size={22} className="text-gray-200" />
              </div>
              <div onClick={() => handleMenuClick('데이터 출처 공시')} className="px-10 py-9 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group">
                 <div className="flex items-center gap-7">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-[#3182f6] transition-colors">
                       <Info size={24} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-lg font-black text-[#191f28]">데이터 공시 및 버전</span>
                       <span className="text-[10px] font-black text-gray-300">v1.5.0-Gemini (Latest)</span>
                    </div>
                 </div>
                 <ChevronRight size={22} className="text-gray-200" />
              </div>
           </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-24 text-center px-10 pb-20 grayscale opacity-10 pointer-events-none select-none">
         <div className="flex justify-center items-center gap-4 mb-3">
            <BarChart3 className="text-gray-900" size={32} />
            <span className="text-3xl font-black tracking-tighter text-gray-900">AI STOCK</span>
         </div>
         <p className="text-[11px] font-black text-gray-400 leading-relaxed uppercase tracking-[0.5em]">
            Professional Trading Tool <br />
            Powered by Google Gemini 1.5
         </p>
      </footer>
    </div>
  );
}

function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}
