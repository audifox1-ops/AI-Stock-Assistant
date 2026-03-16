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
  Moon,
  Sun
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 현재 브라우저의 알림 권한 상태와 다크모드 체크 (로컬)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setIsNotificationEnabled(Notification.permission === 'granted');
      }
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const handleNotificationToggle = async () => {
    console.log('--- Notification Toggle Event ---');
    if (!('Notification' in window)) {
      alert('이 기기는 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsNotificationEnabled(true);
        alert('실시간 가격 알림 서비스가 활성화되었습니다.');
      } else {
        alert('알림 권한이 거부되었습니다. 설정에서 허용해주세요.');
      }
    } else {
      // 이미 허용된 경우 토글 제어 (UI 상의 상태값만 변경할 수도 있음)
      setIsNotificationEnabled(!isNotificationEnabled);
      console.log('Notification permission already granted. UI Toggled.');
    }
  };

  const handleThemeToggle = () => {
    console.log('--- Theme Toggle Event ---');
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      alert('다크 모드로 전환되었습니다.');
    } else {
      document.documentElement.classList.remove('dark');
      alert('라이트 모드로 전환되었습니다.');
    }
  };

  const handleSignOut = () => {
    console.log('--- Sign Out Event ---');
    if (confirm('정말로 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  const handleMenuClick = (menuLabel: string) => {
    console.log(`--- Menu Click: ${menuLabel} ---`);
    alert(`${menuLabel} 기능은 현재 정비 중입니다. 곧 찾아뵙겠습니다!`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* Settings Header */}
      <header className="px-6 pt-12 pb-10 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -mr-32 -mt-32 opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-10 relative z-10">
           <h1 className="text-3xl font-black text-[#191f28] tracking-tight">설정</h1>
           <Settings className="text-gray-200 animate-spin-slow" size={24} />
        </div>
        
        {/* User Card */}
        <div className="bg-white p-7 rounded-[2.5rem] flex items-center gap-6 border border-gray-100 shadow-sm relative z-10">
           <div className="relative">
             {session?.user?.image ? (
               <img src={session.user.image} alt="profile" className="w-20 h-20 rounded-[2rem] border-4 border-gray-50 shadow-md" />
             ) : (
               <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-[#3182f6]">
                  <CreditCard size={32} />
               </div>
             )}
             <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                <CircleCheck size={18} className="text-[#3182f6]" />
             </div>
           </div>
           <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-[#191f28] truncate mb-0.5">{session?.user?.name || '관리자 주주'}님</h2>
              <p className="text-xs font-bold text-gray-400 truncate tracking-tight">{session?.user?.email || '이메일 정보 없음'}</p>
           </div>
        </div>
      </header>

      {/* Settings Options */}
      <div className="mt-10 px-6 space-y-6">
        
        {/* 1. App Control Section */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">App Preference</span>
           </div>
           
           <div className="divide-y divide-gray-50">
              {/* Notification Toggle */}
              <div className="px-8 py-8 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3182f6]">
                       <Bell size={22} />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-black text-[#191f28] text-base">시세 알림 받기</span>
                       <span className="text-[10px] font-bold text-gray-300">목표가 도달 시 푸시 발송</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleNotificationToggle}
                   className={`w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner ${isNotificationEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${isNotificationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              {/* Theme Toggle */}
              <div className="px-8 py-8 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                       {isDarkMode ? <Moon size={22} /> : <Sun size={22} />}
                    </div>
                    <div className="flex flex-col">
                       <span className="font-black text-[#191f28] text-base">다크 모드</span>
                       <span className="text-[10px] font-bold text-gray-300">지치지 않는 눈을 위해</span>
                    </div>
                 </div>
                 <button 
                   onClick={handleThemeToggle}
                   className={`w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner ${isDarkMode ? 'bg-[#191f28]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>
           </div>
        </div>

        {/* 2. Security & Feedback Section */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service Center</span>
           </div>
           
           <div className="divide-y divide-gray-50">
              <div 
                 onClick={() => handleMenuClick('고객 문의')}
                 className="px-8 py-7 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                       <MessageCircle size={20} />
                    </div>
                    <span className="font-black text-[#191f28]">1:1 채팅 문의하기</span>
                 </div>
                 <ChevronRight size={20} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
              </div>

              <div 
                 onClick={() => handleMenuClick('버전 정보')}
                 className="px-8 py-7 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400">
                       <Smartphone size={20} />
                    </div>
                    <span className="font-black text-[#191f28]">버전 및 데이터 출처</span>
                 </div>
                 <span className="text-xs font-black text-blue-500">v1.3.5</span>
              </div>

              <div 
                onClick={handleSignOut}
                className="px-8 py-7 flex items-center justify-between hover:bg-red-50 group transition-all cursor-pointer"
              >
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-all">
                       <LogOut size={20} />
                    </div>
                    <span className="font-bold text-red-500 tracking-tight">서비스 로그아웃</span>
                 </div>
                 <ChevronRight size={20} className="text-red-200" />
              </div>
           </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-20 text-center px-10 pb-10 grayscale opacity-20 pointer-events-none select-none">
         <p className="text-[10px] font-black text-gray-400 leading-relaxed uppercase tracking-[0.4em]">
            Trust & Intelligence <br />
            Next-Gen Stock Partner
         </p>
      </footer>
    </div>
  );
}
