"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChevronLeft, Bot, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ChartPage() {
  // [강제 지침 1] 차트 렌더링 전 마운트 확인 가드
  const [isMounted, setIsMounted] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

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

  // [강제 지침 1] 마운트 전에는 로딩 UI만 표시하여 width 에러 방지
  if (!isMounted) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-400 mx-auto mb-4" size={40} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">System Mounting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="px-5 py-8 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-40">
         <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400">
            <ChevronLeft size={24} />
         </Link>
         <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">태웅 실시간 차트</h1>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Status: Precision Tracking</p>
         </div>
      </header>

      <div className="px-5 mt-6 space-y-8">
         {/* [강제 지침 1] ResponsiveContainer 삭제 및 물리적 하드코딩(350x300) */}
         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-center items-center overflow-hidden">
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

         {/* [강제 지침 3] 검은색 배경 완전 철거 및 파스텔 UI + 원본 에러 노출 */}
         <div className="bg-blue-50 text-slate-800 rounded-2xl p-6 shadow-sm border border-blue-100 break-words w-full">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
               <Bot size={22} className="text-blue-500" /> 🤖 전략가 AI 정밀 진단
            </h3>
            
            {isAiLoading ? (
               <div className="py-4 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-300" size={24} />
                  <p className="text-[10px] font-bold text-blue-200 tracking-widest uppercase">Fetching Google Intelligence...</p>
               </div>
            ) : errorStatus ? (
               <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={18} />
                  <p className="text-sm font-bold text-red-600 leading-relaxed whitespace-pre-wrap">
                     {errorStatus}
                  </p>
               </div>
            ) : (
               <p className="text-base font-bold leading-relaxed text-slate-700">
                  {analysis || "AI 분석 서버와 통신 중입니다..."}
               </p>
            )}
         </div>

         <div className="pb-10">
            <button 
              onClick={fetchAnalysis}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all"
            >
               새로고침 및 재분석
            </button>
         </div>
      </div>
    </div>
  );
}
