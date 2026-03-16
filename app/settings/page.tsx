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
  ExternalLink
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isSupplyAlertEnabled, setIsSupplyAlertEnabled] = useState(false);

  // 알림 권한 상태 체크
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupplyAlertEnabled(Notification.permission === 'granted');
    }
  }, []);

  // 수급 알림 토글 핸들러
  const handleSupplyAlertToggle = async () => {
    console.log('[Settings] Supply Alert Toggle Clicked');
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsSupplyAlertEnabled(true);
        alert('기관/외국인 수급 알림이 활성화되었습니다. 강력한 매수세 포착 시 알려드립니다!');
      } else {
        alert('알림 권한이 거부되었습니다. 주식 수급 실황을 받아보시려면 브라우저 설정에서 권한을 허용해주세요.');
      }
    } else {
      // 이미 권한이 있는 경우 시각적 상태와 로직상의 상태 토글
      const nextState = !isSupplyAlertEnabled;
      setIsSupplyAlertEnabled(nextState);
      alert(nextState ? '수급 알림이 켜졌습니다.' : '수급 알림을 껐습니다.');
    }
  };

  // 로그아웃 핸들러 (실제 동작)
  const handleSignOut = () => {
    console.log('[Settings] Sign Out Requested');
    if (confirm('AI Stock에서 안전하게 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  // 준비 중인 기능 핸들러
  const handleMenuClick = (menuLabel: string) => {
    console.log(`[Settings] Menu Click: ${menuLabel}`);
    alert(`'${menuLabel}' 기능은 고도화 작업 중입니다. 더 나은 투자 경험을 위해 노력하고 있습니다.`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
      {/* Settings Header */}
      <header className="px-6 pt-16 pb-12 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gray-50 rounded-full -mr-40 -mt-40 opacity-30 select-none pointer-events-none" />
        <div className="flex justify-between items-center mb-12 relative z-10 px-2">
           <h1 className="text-4xl font-black text-[#191f28] tracking-tight">설정</h1>
           <Settings className="text-gray-200 animate-spin-slow" size={30} />
        </div>
        
        {/* User Identity Card */}
        <div className="bg-white p-8 rounded-[3rem] flex items-center gap-6 border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] relative z-10 group transition-all">
           {session?.user?.image ? (
             <img src={session.user.image} alt="profile" className="w-22 h-22 rounded-[2.5rem] border-4 border-gray-50 shadow-lg group-hover:rotate-3 transition-transform" />
           ) : (
             <div className="w-22 h-22 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-[#3182f6]">
                <Settings size={40} />
             </div>
           )}
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                 <h2 className="text-2xl font-black text-[#191f28] truncate">{session?.user?.name || 'V-Premium User'}</h2>
                 <CircleCheck size={20} className="text-[#3182f6] flex-shrink-0" />
              </div>
              <p className="text-sm font-bold text-gray-400 truncate tracking-tight px-1">{session?.user?.email || 'Premium Membership Active'}</p>
           </div>
        </div>
      </header>

      {/* Settings Nav Area */}
      <div className="mt-12 px-6 space-y-8">
        
        {/* 1. Account & Security Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">Account & Management</span>
              <ShieldCheck size={18} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              <div 
                 onClick={() => handleMenuClick('내 투자 정보 수정')}
                 className="px-10 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3182f6] group-hover:scale-110 transition-transform">
                       <CreditCard size={24} />
                    </div>
                    <span className="text-lg font-black text-[#191f28]">내 자산 정보 관리</span>
                 </div>
                 <ChevronRight size={22} className="text-gray-200" />
              </div>
              
              <div 
                onClick={handleSignOut}
                className="px-10 py-8 flex items-center justify-between hover:bg-red-50 group transition-all cursor-pointer"
              >
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                       <LogOut size={24} />
                    </div>
                    <span className="text-lg font-black text-red-500 tracking-tight">서비스 로그아웃</span>
                 </div>
                 <div className="w-12 h-12 flex items-center justify-center text-red-200">
                    <ExternalLink size={20} />
                 </div>
              </div>
           </div>
        </div>

        {/* 2. Notification & Insights Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">Smart Insights</span>
              <BellRing size={18} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* Supply Alert Toggle */}
              <div className="px-10 py-9 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'} rounded-2xl flex items-center justify-center text-white transition-all`}>
                       <Bell size={24} className={isSupplyAlertEnabled ? 'animate-bounce' : ''} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-lg font-black text-[#191f28]">기관/외인 수급 알림</span>
                       <span className="text-[11px] font-bold text-gray-300 tracking-tighter uppercase mt-0.5">Public Data Portal API Sync</span>
                    </div>
                 </div>
                 
                 {/* Premium Apple-style Toggle */}
                 <button 
                   onClick={handleSupplyAlertToggle}
                   className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 shadow-inner ${isSupplyAlertEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-xl transition-all duration-500 transform ${isSupplyAlertEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div 
                 onClick={() => handleMenuClick('투자 목표 설정')}
                 className="px-10 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-400 group-hover:rotate-12 transition-transform">
                       <Target size={24} />
                    </div>
                    <span className="text-lg font-black text-[#191f28]">나의 투자 목표</span>
                 </div>
                 <ChevronRight size={22} className="text-gray-200" />
              </div>

              <div 
                 onClick={() => handleMenuClick('고객 커뮤니티')}
                 className="px-10 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                       <MessageCircle size={24} />
                    </div>
                    <span className="text-lg font-black text-[#191f28]">커뮤니티 및 피드백</span>
                 </div>
                 <ChevronRight size={22} className="text-gray-200" />
              </div>
           </div>
        </div>

        {/* 3. Info Section */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-10 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group" onClick={() => handleMenuClick('버전 정보')}>
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                   <Info size={24} />
                </div>
                <div className="flex flex-col">
                   <span className="text-lg font-black text-[#191f28]">서비스 정보 및 약관</span>
                   <span className="text-[10px] font-black text-gray-300">현재 버전 v1.4.2 (Latest)</span>
                </div>
             </div>
             <ChevronRight size={22} className="text-gray-200" />
          </div>
        </div>

      </div>

      {/* Footer Identity */}
      <footer className="mt-20 text-center px-10 pb-16 space-y-6 grayscale opacity-20 pointer-events-none select-none">
         <div className="flex justify-center items-center gap-3">
            <BarChart3 className="text-gray-900" size={32} />
            <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase">AI STOCK</span>
         </div>
         <p className="text-[10px] font-black text-gray-400 leading-relaxed uppercase tracking-[0.5em]">
            Professional Trading Insight <br />
            Powered by Public Data Portal API
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
