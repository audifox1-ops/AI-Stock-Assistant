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
  Settings
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationToggle = async () => {
    console.log('Notification toggle clicked');
    if (!('Notification' in window)) {
      alert('공지: 이 기기는 알림을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsNotificationEnabled(true);
        console.log('Permission granted');
      }
    } else {
      console.log('Already granted');
      alert('알림이 현재 활성화되어 있습니다.');
    }
  };

  const handleSignOut = () => {
    console.log('Sign out request initiated');
    if (confirm('AI Stock에서 로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  const menuAction = (label: string) => {
    console.log(`${label} action triggered`);
    alert(`${label} 기능은 현재 준비 중입니다.`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* Settings Header */}
      <header className="px-6 pt-12 pb-10 bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -mr-32 -mt-32 opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-10 relative z-10">
           <h1 className="text-3xl font-black text-[#191f28] tracking-tight">설정</h1>
           <Settings className="text-gray-200" size={24} />
        </div>
        
        {/* Advanced User Profile Card */}
        <div className="bg-white p-7 rounded-[2.5rem] flex items-center gap-6 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] relative z-10 group">
           {session?.user?.image ? (
             <img src={session.user.image} alt="profile" className="w-20 h-20 rounded-[2rem] border-4 border-gray-50 shadow-md group-hover:scale-105 transition-transform" />
           ) : (
             <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-[#3182f6]">
                <Settings size={36} />
             </div>
           )}
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                 <h2 className="text-2xl font-black text-[#191f28] truncate">{session?.user?.name || '관리자'}</h2>
                 <CircleCheck size={18} className="text-[#3182f6] flex-shrink-0" />
              </div>
              <p className="text-xs font-bold text-gray-400 truncate tracking-tight">{session?.user?.email || '연결된 계정 없음'}</p>
           </div>
        </div>
      </header>

      {/* Modern Menu Grid & List */}
      <div className="mt-10 px-6 space-y-6">
        
        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div onClick={() => menuAction('내 자산')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center cursor-pointer hover:bg-white/80 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3182f6] mx-auto mb-4">
                 <CreditCard size={24} />
              </div>
              <span className="font-extrabold text-[#191f28] text-sm tracking-tight">내 자산</span>
           </div>
           <div onClick={() => menuAction('투자 목표')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center cursor-pointer hover:bg-white/80 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-400 mx-auto mb-4">
                 <Target size={24} />
              </div>
              <span className="font-extrabold text-[#191f28] text-sm tracking-tight">투자 목표</span>
           </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Security & Identity</span>
              <ShieldCheck size={16} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              <div className="px-8 py-7 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => menuAction('비밀번호')}>
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#3182f6] group-hover:bg-blue-50 transition-all">
                       <ShieldCheck size={20} />
                    </div>
                    <span className="font-black text-[#191f28]">보안 및 개인정보</span>
                 </div>
                 <ChevronRight size={20} className="text-gray-200" />
              </div>
              
              <div 
                onClick={handleSignOut}
                className="px-8 py-7 flex items-center justify-between hover:bg-red-50 group transition-all cursor-pointer"
              >
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400 group-hover:bg-red-100">
                       <LogOut size={20} />
                    </div>
                    <span className="font-black text-[#191f28] group-hover:text-red-500">로그아웃 하기</span>
                 </div>
                 <ChevronRight size={20} className="text-gray-200" />
              </div>
           </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
           <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Feedback & Support</span>
              <MessageCircle size={16} className="text-gray-200" />
           </div>
           
           <div className="divide-y divide-gray-50">
              <div className="px-8 py-8 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#3182f6]">
                       <Bell size={20} />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-black text-[#191f28]">실시간 시세 알림</span>
                       <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Automatic Push Notify</span>
                    </div>
                 </div>
                 
                 {/* Modern Apple-style Toggle */}
                 <button 
                   onClick={handleNotificationToggle}
                   className={`w-14 h-8 rounded-full p-1 transition-all duration-500 shadow-inner ${isNotificationEnabled ? 'bg-[#3182f6]' : 'bg-gray-100'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${isNotificationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="px-8 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group" onClick={() => menuAction('고객 센터')}>
                 <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500 group-hover:bg-green-100 transition-all">
                       <Smartphone size={20} />
                    </div>
                    <span className="font-black text-[#191f28]">버전 및 도움말</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-500">v1.2.0</span>
                    <ChevronRight size={20} className="text-gray-200" />
                 </div>
              </div>

              <div className="px-8 py-8 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group" onClick={() => menuAction('문의하기')}>
                <div className="flex items-center gap-5">
                   <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-400">
                      <Info size={20} />
                   </div>
                   <span className="font-black text-[#191f28]">1:1 문의하기</span>
                </div>
                <ChevronRight size={20} className="text-gray-200" />
              </div>
           </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-20 text-center space-y-5 px-10 pb-10">
         <div className="flex justify-center items-center gap-3 grayscale opacity-30 select-none">
            <div className="w-9 h-9 bg-gray-300 rounded-[1.2rem]" />
            <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">AI Stock Assistant</span>
         </div>
         <p className="text-[10px] font-black text-gray-300 leading-relaxed uppercase tracking-[0.3em]">
            Empowering Your Intelligent Investment <br />
            © AI STOCK INC. 2026.
         </p>
      </footer>

    </div>
  );
}
