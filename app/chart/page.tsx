"use client";

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { RefreshCcw, TrendingUp, ChevronLeft, Calendar, Info, BarChart3, Bot, Sparkles, TrendingDown } from 'lucide-react';
import Link from 'next/link';

// --- Mock Data ---
const mockData = [
  { name: '03-10', price: 47200 },
  { name: '03-11', price: 48500 },
  { name: '03-12', price: 46800 },
  { name: '03-13', price: 49200 },
  { name: '03-14', price: 51000 },
  { name: '03-15', price: 50200 },
  { name: '현재', price: 52500 },
];

export default function ChartPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [period, setPeriod] = useState('1일');

  // Next.js 하이드레이션 에러 완전 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="animate-spin text-[#3182f6]" size={36} />
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">분석 엔진 가동 중...</span>
      </div>
    );
  }

  const periods = ['1일', '1주', '1달', '1년', '전체'];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 1. Header & Stock Info */}
      <header className="px-6 pt-10 pb-8 bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center gap-4 mb-8">
           <Link href="/" className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <ChevronLeft size={28} />
           </Link>
           <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <h1 className="text-2xl font-black text-[#191f28] tracking-tight">태웅</h1>
                 <span className="text-sm font-bold text-gray-400">044490.KQ</span>
              </div>
              <p className="text-[10px] font-bold text-[#3182f6] uppercase tracking-widest mt-1 px-1">Deep Intelligence Analytics</p>
           </div>
        </div>

        <div className="flex justify-between items-end px-2">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">현재가</p>
              <div className="flex items-baseline gap-2">
                 <h2 className="text-5xl font-black text-[#191f28] tracking-tighter">52,500</h2>
                 <span className="text-xl font-bold text-gray-400">원</span>
              </div>
           </div>
           <div className="text-right flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 bg-red-50 rounded-lg text-sm font-bold text-[#EF4444] flex items-center gap-1">
                 <TrendingUp size={16} />
                 <span>+2,300 (+4.6%)</span>
              </div>
              <span className="text-[10px] font-bold text-gray-300">2026.03.16 11:45 기준</span>
           </div>
        </div>
      </header>

      {/* 2. Chart Section */}
      <section className="px-6 mt-8 space-y-6">
         {/* Period Selection Tabs */}
         <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100 w-fit mx-auto shadow-sm">
            {periods.map(p => (
               <button 
                 key={p} 
                 onClick={() => setPeriod(p)}
                 className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-[#3182f6] text-white shadow-md' : 'text-gray-400 hover:text-gray-700'}`}
               >
                  {p}
               </button>
            ))}
         </div>

         {/* Chart Box (Wide Card) */}
         <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm h-[400px] relative overflow-hidden group">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                  data={mockData}
                  margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
               >
                  <defs>
                     <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                     vertical={false} 
                     strokeDasharray="4 8" 
                     stroke="#F8FAFC" 
                  />
                  
                  <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 11, fontWeight: 700, fill: '#CBD5E1' }}
                     dy={15}
                  />
                  <YAxis hide={true} />
                  
                  <Tooltip 
                     cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
                     contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontWeight: '800',
                        padding: '16px 20px',
                        background: 'rgba(255, 255, 255, 0.95)'
                     }}
                     labelStyle={{ color: '#94A3B8', marginBottom: '4px', fontSize: '10px', fontWeight: '800' }}
                     itemStyle={{ color: '#3182f6' }}
                  />
                  
                  <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="#3182f6" 
                     strokeWidth={4} 
                     fillOpacity={1} 
                     fill="url(#chartGradient)" 
                     activeDot={{ r: 8, fill: '#3182f6', strokeWidth: 3, stroke: '#fff' }}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </section>

      {/* 3. AI Intelligence Report Section (Distinct Area) */}
      <section className="mt-12 px-6 pb-20 space-y-6">
         <div className="flex items-center gap-2 px-1">
            <Bot size={20} className="text-[#3182f6]" />
            <h3 className="text-lg font-bold text-[#191f28]">AI 인텔리전스 분석</h3>
         </div>

         <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 flex items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
               <Sparkles size={100} />
            </div>
            
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
               <TrendingUp size={24} />
            </div>
            
            <div className="relative z-10 space-y-4">
               <div>
                  <h4 className="text-xl font-bold mb-1">상승 동력 포착</h4>
                  <p className="text-sm font-medium text-blue-50 leading-relaxed">
                     지속적인 외인 매수세와 차트상의 수렴 패턴이 결합되어 단기 상방 압력이 강해지고 있습니다. 
                     전고점 돌파 여부를 주시하세요.
                  </p>
               </div>
               
               <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                     <span className="text-[10px] font-bold uppercase text-blue-200">AI 컨피던스</span>
                     <p className="text-lg font-bold">안심 (84%)</p>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold uppercase text-blue-200">예상 매물대</span>
                     <p className="text-lg font-bold">54,000원</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Secondary Metrics Cards */}
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">오늘의 거래량</span>
               <div className="text-2xl font-black text-[#191f28]">1.2M</div>
            </div>
            <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">RSI 지수</span>
               <div className="text-2xl font-black text-amber-500">62.8</div>
            </div>
         </div>
      </section>
    </div>
  );
}
