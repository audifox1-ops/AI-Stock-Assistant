"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCcw, TrendingUp, ChevronLeft, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
      <header className="px-6 py-12 bg-white border-b border-slate-100 sticky top-0 z-40">
         <div className="max-w-3xl mx-auto flex items-center gap-6">
            <Link href="/" className="p-4 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100 transition-all">
               <ChevronLeft size={28} />
            </Link>
            <div>
               <h1 className="text-4xl font-bold text-slate-900 tracking-tight">태웅 실시간 차트</h1>
               <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">Real-time Analysis active</p>
            </div>
         </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-10">
         <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center">
            {/* 사용자 지시: 차트 래퍼 물리적 높이 강제 및 width: 100% */}
            <div style={{ width: '100%', minHeight: '300px', height: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <defs>
                        <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
                     <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#cbd5e1' }} />
                     <YAxis hide={true} domain={['auto', 'auto']} />
                     <Tooltip />
                     <Area type="monotone" dataKey="price" stroke="#3182f6" strokeWidth={4} fillOpacity={1} fill="url(#chartColor)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Tech-AI Analysis Card */}
         <section className="bg-slate-900 rounded-[2.5rem] p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Bot size={28} className="text-blue-400" />
               </div>
               <h3 className="text-2xl font-bold">전략가 AI 정밀 진단</h3>
            </div>
            {isAiLoading ? (
               <div className="py-10 text-center flex flex-col items-center gap-6">
                  <Loader2 className="animate-spin text-white opacity-40" size={48} />
                  <p className="text-xs font-bold opacity-30 tracking-widest uppercase">Deep Learning in progress...</p>
               </div>
            ) : (
               <div className="animate-in fade-in duration-1000">
                  <p className="text-2xl font-bold leading-[2] text-slate-200 whitespace-pre-line italic">
                     "{analysis || "분석 결과를 불러오는 중..."}"
                  </p>
               </div>
            )}
         </section>
      </div>
    </div>
  );
}
