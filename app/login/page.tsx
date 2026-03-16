"use client";

import React from 'react';
import { signIn } from "next-auth/react";
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo & Title */}
        <div className="mb-16 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-6 mx-auto shadow-sm">
            <h1 className="text-4xl font-black text-[#3182f6]">A</h1>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-[#191f28] mb-3">AI Stock</h2>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Intelligent Portfolio</p>
        </div>

        {/* Login Button */}
        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full h-16 bg-[#191f28] text-white rounded-[2rem] flex items-center justify-center gap-4 font-black shadow-2xl active:scale-95 transition-all hover:bg-black"
        >
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
            <LogIn size={14} className="text-black" />
          </div>
          Google로 시작하기
        </button>

        <p className="mt-10 text-gray-300 text-[10px] font-bold text-center leading-relaxed">
          로그인 시 서비스 이용약관 및 <br /> 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
