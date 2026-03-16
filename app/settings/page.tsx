"use client";

import React, { useState, useEffect } from 'react';
import { signOut, useSession } from "next-auth/react";
import { 
  LogOut, 
  Bell, 
  ChevronRight, 
  User, 
  ShieldCheck, 
  Smartphone, 
  Info,
  CircleCheck
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  // 현재 브라우저의 알림 권한 상태 체크
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsNotificationEnabled(true);
        alert('실시간 알림이 활성화되었습니다.');
      }
    } else {
      alert('이미 알림 권한이 허용되어 있습니다. 브라우저 설정에서 관리하실 수 있습니다.');
    }
  };

  const handleSignOut = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Settings Header */}
      <header className="px-6 pt-12 pb-8 bg-white border-b border-gray-100">
        <h1 className="text-3xl font-black text-[#191f28] tracking-tight mb-8">설정</h1>
        
        {/* User Profile Card */}
        <div className="bg-gray-50 p-6 rounded-[2rem] flex items-center gap-5 border border-gray-100">
           {session?.user?.image ? (
             <img src={session.user.image} alt="profile" className="w-16 h-16 rounded-full border-4 border-white shadow-sm" />
           ) : (
             <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                <User size={30} />
             </div>
           )}
           <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-[#191f28] truncate">{session?.user?.name || '사용자'}님</h2>
              <p className="text-sm font-bold text-gray-400 truncate">{session?.user?.email || '연결된 계정이 없습니다'}</p>
           </div>
           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <CircleCheck size={20} className="text-blue-500" />
           </div>
        </div>
      </header>

      {/* Settings Menu List */}
      <div className="mt-8 px-6 space-y-4">
        
        {/* Account Section */}
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100/50">
           <div className="p-4 px-6 border-b border-gray-50">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Account & Security</span>
           </div>
           
           <div className="divide-y divide-gray-50">
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                       <ShieldCheck size={20} />
                    </div>
                    <span className="font-extrabold text-[#111827]">개인정보 보호 설정</span>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
              
              <div 
                onClick={handleSignOut}
                className="p-6 flex items-center justify-between hover:bg-red-50 group transition-all cursor-pointer"
              >
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400 group-hover:bg-red-100">
                       <LogOut size={20} />
                    </div>
                    <span className="font-extrabold text-[#111827] group-hover:text-red-500">로그아웃</span>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
           </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100/50">
           <div className="p-4 px-6 border-b border-gray-50">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">App Services</span>
           </div>
           
           <div className="divide-y divide-gray-50">
              <div className="p-6 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400">
                       <Bell size={20} />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-extrabold text-[#111827]">시세 알림 받기</span>
                       <span className="text-[10px] font-bold text-gray-300">목표가 도달 시 푸시 발송</span>
                    </div>
                 </div>
                 
                 {/* Custom Toggle Switch */}
                 <button 
                   onClick={handleNotificationToggle}
                   className={`w-14 h-8 rounded-full p-1 transition-all duration-300 shadow-inner ${isNotificationEnabled ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
                 >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${isNotificationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                       <Smartphone size={20} />
                    </div>
                    <span className="font-extrabold text-[#111827]">버전 정보</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-500">v1.2.0</span>
                    <ChevronRight size={18} className="text-gray-300" />
                 </div>
              </div>
           </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100/50">
          <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                   <Info size={20} />
                </div>
                <span className="font-extrabold text-[#111827]">고객 센터 및 FAQ</span>
             </div>
             <ChevronRight size={18} className="text-gray-300" />
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-16 text-center space-y-4 px-10">
         <div className="flex justify-center items-center gap-3 grayscale opacity-30">
            <div className="w-8 h-8 bg-gray-400 rounded-xl" />
            <span className="text-lg font-black tracking-tighter text-gray-900 uppercase">AI Stock</span>
         </div>
         <p className="text-[10px] font-bold text-gray-300 leading-relaxed uppercase tracking-widest">
            Toss Intelligent Investment Partner <br />
            Since 2026. All Rights Reserved.
         </p>
      </footer>

    </div>
  );
}
