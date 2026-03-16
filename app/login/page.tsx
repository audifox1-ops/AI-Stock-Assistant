"use client";

import React from 'react';
import { signIn } from "next-auth/react";
import { LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-10 pb-20 animate-in fade-in duration-1000">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {/* Tosh-style Modern Logo */}
        <div className="mb-20 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-sm border border-blue-100/50">
            <h1 className="text-5xl font-black text-[#3182f6] tracking-tighter">A</h1>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-gray-900 mb-4">AI Stock</h2>
          <p className="text-gray-400 font-black text-xs tracking-[0.2em] uppercase px-4 py-2 bg-gray-50 rounded-full inline-block">
            Intelligent Wealth
          </p>
        </div>

        {/* Login Button Container */}
        <div className="w-full space-y-4">
            <button 
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full h-18 py-6 bg-[#3182f6] text-white rounded-[2rem] flex items-center justify-center gap-4 font-black shadow-[0_10px_40px_rgba(49,130,246,0.2)] active:scale-95 transition-all hover:bg-[#2067d9]"
            >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                    <LogIn size={16} />
                </div>
                Google로 시작하기
            </button>
            
            <button className="w-full py-5 text-gray-300 font-bold text-sm hover:text-gray-400 transition-colors">
                이메일로 계속하기
            </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-sm">
         <div className="flex items-center gap-2 justify-center mb-6 text-blue-500/50">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest">Safe & Encryption</span>
         </div>
         <p className="text-gray-300 text-[10px] font-bold text-center leading-relaxed">
            AI Stock은 사용자의 금융 데이터를 안전하게 관리합니다. <br />
            로그인 시 모든 <span className="text-gray-400 underline cursor-pointer">서비스 정책</span>에 동의하게 됩니다.
         </p>
      </div>
    </div>
  );
}
