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
import { RefreshCcw, TrendingUp, ChevronLeft, Calendar, Info, BarChart3, Bot, Sparkles } from 'lucide-react';
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

  // Next.js 하이드레이션 에러 완전 방지
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="relative">
           <RefreshCcw className="animate-spin text-[#3182f6]" size={48} />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
           </div>
        </div>
        <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">Igniting AI Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Dynamic Header */}
      <header className="px-6 pt-12 pb-12 bg-white sticky top-0 z-40 border-b border-gray-100 shadow-sm backdrop-blur-xl bg-white/90">
        <div className="flex items-center gap-6 mb-14">
          <Link href="/" className="w-14 h-14 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-400 hover:text-[#3182f6] hover:bg-blue-50 transition-all active:scale-95">
            <ChevronLeft size={30} />
          </Link>
          <div className="flex flex-col">
             <h1 className="text-3xl font-black text-[#191f28] tracking-tighter leading-none">수익 자산 심층 분석</h1>
             <div className="flex items-center gap-2 mt-3">
                <Calendar size={12} className="text-[#3182f6]" strokeWidth={3} />
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Real-time Asset Performance</span>
             </div>
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="px-4 flex justify-between items-end">
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase mb-3 tracking-[0.2em]">Current Peak Value</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-6xl font-black text-[#EF4444] tracking-tighter">52,500</h2>
              <span className="text-3xl font-black text-gray-400">원</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="px-3.5 py-1.5 bg-red-50 rounded-xl text-xs font-black text-[#EF4444] flex items-center gap-1.5">
                <TrendingUp size={16} />
                <span>+4.6%</span>
             </div>
             <span className="text-[10px] font-extrabold text-blue-500">Bullish Market Entry</span>
          </div>
        </div>
      </header>

      {/* Advanced Chart Container (Wide Card) */}
      <section className="px-6 mt-14 w-full h-[480px]">
        <div className="w-full h-full bg-white rounded-[3.5rem] p-9 shadow-[0_40px_100px_rgba(0,0,0,0.05)] border border-gray-100 relative group overflow-hidden">
          <div className="absolute top-10 left-10 flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-pulse" />
             <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.25em]">Live Intelligence Stream</span>
          </div>
          
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform group-hover:scale-125 duration-1000">
             <BarChart3 size={150} />
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mockData}
              margin={{ top: 80, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="6 12" 
                stroke="#F1F5F9" 
              />
              
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 13, fontWeight: 900, fill: '#CBD5E1' }}
                dy={25}
              />
              <YAxis hide={true} />
              
              <Tooltip 
                cursor={{ stroke: '#F1F5F9', strokeWidth: 3 }}
                contentStyle={{ 
                  borderRadius: '35px', 
                  border: 'none', 
                  boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
                  fontSize: '16px',
                  fontWeight: '950',
                  padding: '28px',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(10px)'
                }}
                labelStyle={{ color: '#94A3B8', marginBottom: '10px', fontSize: '11px', fontWeight: '900', letterSpacing: '0.1em' }}
                itemStyle={{ color: '#EF4444', textTransform: 'uppercase' }}
              />
              
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#EF4444" 
                strokeWidth={7} 
                fillOpacity={1} 
                fill="url(#aiGradient)" 
                animationDuration={3500}
                activeDot={{ r: 12, fill: '#EF4444', strokeWidth: 6, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* AI Strategist Review */}
      <section className="px-8 mt-20 space-y-8">
         <div className="p-10 bg-[#3182f6] rounded-[3.5rem] shadow-xl shadow-blue-100 flex items-start gap-7 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-20 transition-transform group-hover:rotate-12 duration-700">
               <Bot size={80} />
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center shadow-inner flex-shrink-0">
               <Sparkles size={32} className="text-white" />
            </div>
            <div className="relative z-10">
               <h4 className="text-2xl font-black mb-2 flex items-center gap-3">
                  AI 종합 리포트
                  <div className="h-2 w-10 bg-white/30 rounded-full" />
               </h4>
               <p className="text-sm font-bold text-blue-50/80 leading-relaxed tracking-tight">
                  현재 지표는 아주 긍정적입니다. Gemini 엔진이 분석한 결과, **수급 골든크로스**가 임박했습니다. 
                  단기 수익 실현보다는 비중을 유지하며 상승 파동을 즐기시길 강력히 권장합니다.
               </p>
            </div>
         </div>

         {/* Detailed Metrics Grid */}
         <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-9 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col items-center group hover:bg-red-50 transition-colors duration-500">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Investment Power</span>
               <div className="text-4xl font-black text-[#EF4444] tracking-tighter">98%</div>
               <div className="mt-3 px-3 py-1 bg-red-100/50 rounded-lg text-[10px] font-black text-[#EF4444]">High Potential</div>
            </div>
            <div className="bg-white p-9 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col items-center group hover:bg-blue-50 transition-colors duration-500">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Risk Resistance</span>
               <div className="text-4xl font-black text-blue-600 tracking-tighter">Superb</div>
               <div className="mt-3 px-3 py-1 bg-blue-100/50 rounded-lg text-[10px] font-black text-blue-600">Stable Growth</div>
            </div>
         </div>
      </section>
    </div>
  );
}
