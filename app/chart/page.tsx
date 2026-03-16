"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChevronLeft, Bot, Loader2, AlertCircle, HelpCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ChartPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const data = [
    { time: '09:00', price: 54200 },
    { time: '10:00', price: 54800 },
    { time: '11:00', price: 53900 },
    { time: '12:00', price: 55100 },
    { time: '13:00', price: 55800 },
    { time: '14:00', price: 55300 },
    { time: '15:00', price: 56500 },
  ];

  useEffect(() => { 
    setIsMounted(true); 
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setIsAiLoading(true);
    setAnalysis(null);
    setErrorStatus(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: "TAEWOONG", name: "태웅", price: 56500, changePercent: 4.2 }),
        cache: 'no-store'
      });
      const result = await res.json();
      if (result.error) {
        setErrorStatus(result.error);
      } else {
        setAnalysis(result.analysis);
      }
    } catch (e: any) {
      setErrorStatus("네트워크 연결 실패: " + e.message);
    } finally { setIsAiLoading(false); }
  };

  if (!isMounted) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-400 mx-auto mb-4" size={40} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Mounting Chart System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <header className="px-5 py-6 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-40">
         <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
            <ChevronLeft size={24} />
         </Link>
         <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">태웅 실시간 차트</h1>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Symbol: KOSDAQ 044490</p>
         </div>
      </header>

      <div className="px-5 mt-6 space-y-6">
         {/* 차트 영역 - 물리적 고정(350x300) 유지 */}
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center overflow-hidden">
            <div className="w-full flex justify-between items-center mb-4 px-2">
               <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-green-500" /> 실시간 변동량
               </span>
               <span className="text-[10px] text-slate-300">Updated: Just Now</span>
            </div>
            <AreaChart 
              width={350} 
              height={300} 
              data={data} 
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
               <defs>
                  <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                  </linearGradient>
               </defs>
               <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
               <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
               <YAxis hide={true} domain={['auto', 'auto']} />
               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
               <Area type="monotone" dataKey="price" stroke="#3182f6" strokeWidth={3} fillOpacity={1} fill="url(#chartColor)" />
            </AreaChart>
         </div>

         {/* [5차 핵심] 도움말 시스템 및 가독성 최적화 AI 리포트 */}
         <div className="bg-blue-50 text-slate-800 rounded-2xl p-6 shadow-sm border border-blue-100 relative">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold flex items-center gap-2">
                  <Bot size={22} className="text-blue-500" /> 🤖 전략가 AI 정밀 진단
                  {/* 도움말 아이콘 및 툴팁 */}
                  <div className="relative inline-block ml-1">
                     <HelpCircle 
                        size={16} 
                        className="text-blue-200 cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() => setShowTooltip(!showTooltip)}
                     />
                     {showTooltip && (
                        <div className="absolute left-6 -top-2 w-48 bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                           <p className="font-bold mb-1">💡 AI 정밀 진단이란?</p>
                           AI가 현재 차트 패턴, 실시간 체결 강도, 외국인 및 기관의 매수세를 종합 분석하여 3줄 핵심 가이드를 제시합니다.
                        </div>
                     )}
                  </div>
               </h3>
               {!isAiLoading && (
                  <button onClick={fetchAnalysis} className="text-blue-400">
                     <RefreshCcw size={16} className={isAiLoading ? 'animate-spin' : ''} />
                  </button>
               )}
            </div>
            
            <div className="min-h-[140px] flex flex-col justify-center">
               {isAiLoading ? (
                  <div className="py-6 flex flex-col items-center gap-3">
                     <Loader2 className="animate-spin text-blue-300" size={28} />
                     <p className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Analyzing Deep Data...</p>
                  </div>
               ) : errorStatus ? (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                     <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={18} />
                     <p className="text-xs font-bold text-red-600 leading-relaxed whitespace-pre-wrap">
                        {errorStatus}
                     </p>
                  </div>
               ) : (
                  /* 가독성 최적화 클래스 적용 */
                  <p className="text-base font-bold leading-relaxed text-slate-700 whitespace-pre-wrap">
                     {analysis || "종목 데이터를 분석 중입니다. 잠시만 기다려 주세요."}
                  </p>
               )}
            </div>
         </div>

         <div className="pb-4">
            <Link 
              href="/" 
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-slate-200 active:scale-[0.98] transition-all"
            >
               목록으로 돌아가기
            </Link>
         </div>
      </div>
    </div>
  );
}

// Icon helper for TrendingUp (used but not defined locally)
function TrendingUp(props: any) {
   return (
     <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
   )
}
