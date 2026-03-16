"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCcw, TrendingUp, ChevronLeft, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';

// [최종 강제 주입] 캐시 파괴 설정
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default function ChartPage() {
  const [data, setData] = useState([
    { time: '09:00', price: 54200 },
    { time: '10:00', price: 54800 },
    { time: '11:00', price: 53900 },
    { time: '12:00', price: 55100 },
    { time: '13:00', price: 55800 },
    { time: '14:00', price: 55300 },
    { time: '15:00', price: 56500 },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setIsAiLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: "TAEWOONG", name: "태웅", price: 56500, changePercent: 4.2 }),
        cache: 'no-store'
      });
      const result = await res.json();
      setAnalysis(result.analysis || result.error);
    } catch (e) {
      setAnalysis("AI 엔진 오류 발생");
    } finally { setIsAiLoading(false); }
  };

  useEffect(() => { fetchAnalysis(); }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="px-5 py-8 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-40">
         <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400">
            <ChevronLeft size={24} />
         </Link>
         <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">태웅 실시간 차트</h1>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Real-time Analysis active</p>
         </div>
      </header>

      <div className="px-5 mt-6 space-y-8">
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            {/* [최종 강제 주입] 차트 래퍼 물리적 높이 및 인라인 스타일 강제 */}
            <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <defs>
                        <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
                     <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                     <YAxis hide={true} domain={['auto', 'auto']} />
                     <Tooltip />
                     <Area type="monotone" dataKey="price" stroke="#3182f6" strokeWidth={3} fillOpacity={1} fill="url(#chartColor)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* [최종 강제 주입] 기괴한 검은색 배경 철거 및 파스텔톤 클린 UI 적용 */}
         <div className="bg-blue-50 text-slate-800 rounded-2xl p-6 shadow-sm border border-blue-100 break-words w-full">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
               <Bot size={22} className="text-blue-500" /> 전략가 AI 정밀 진단
            </h3>
            {isAiLoading ? (
               <div className="py-4 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-300" size={24} />
                  <p className="text-[10px] font-bold text-blue-200 tracking-widest uppercase">Deep Learning...</p>
               </div>
            ) : (
               <p className="text-base font-bold leading-relaxed opacity-90">
                  {analysis || "AI 분석 서버와 통신 중입니다..."}
               </p>
            )}
         </div>

         <div className="pb-10">
            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all">
               추가 정밀 분석 요청
            </button>
         </div>
      </div>
    </div>
  );
}
