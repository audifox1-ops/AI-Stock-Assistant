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
import { RefreshCcw, TrendingUp, ChevronLeft, Calendar, Info } from 'lucide-react';
import Link from 'next/link';

// --- Mock Data ---
const mockData = [
  { name: '03-10', price: 47200 },
  { name: '03-11', price: 48500 },
  { name: '03-12', price: 46800 },
  { name: '03-13', price: 49200 },
  { name: '03-14', price: 51000 },
  { name: '03-15', price: 50200 },
  { name: '지금', price: 52500 },
];

export default function ChartPage() {
  const [isMounted, setIsMounted] = useState(false);

  // Next.js 하이드레이션 에러 방지를 위한 마운트 가드
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="animate-spin text-[#3182f6]" size={40} />
        <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Loading Analytics...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Chart Header Area */}
      <header className="px-6 pt-12 pb-10 bg-white sticky top-0 z-30 border-b border-gray-50/50 backdrop-blur-xl bg-white/90">
        <div className="flex items-center gap-5 mb-12">
          <Link href="/" className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#3182f6] hover:bg-blue-50 transition-all active:scale-90">
            <ChevronLeft size={28} />
          </Link>
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-[#191f28] tracking-tight leading-none">수익 지표 분석</h1>
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Calendar size={12} /> Real-time Performance
             </span>
          </div>
        </div>

        {/* Visual Price Card */}
        <div className="px-4">
          <p className="text-[11px] font-black text-gray-300 uppercase mb-2 tracking-widest">Asset Peak Value</p>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-6xl font-black text-[#EF4444] tracking-tighter">52,500</h2>
            <span className="text-3xl font-black text-gray-400">원</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl text-xs font-black text-[#EF4444]">
              <TrendingUp size={16} />
              <span>+4.6% (전주 대비)</span>
            </div>
            <span className="text-[10px] font-bold text-gray-300">최근 업데이트: 방금 전</span>
          </div>
        </div>
      </header>

      {/* Professional Chart Content (와이드 카드 디자인) */}
      <section className="px-6 mt-12 w-full h-[450px]">
        <div className="w-full h-full bg-white rounded-[3rem] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.04)] border border-gray-50 relative group">
          <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
             <div className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Live Price Stream</span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mockData}
              margin={{ top: 60, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="5 15" 
                stroke="#F3F4F6" 
              />
              
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 13, fontWeight: 900, fill: '#D1D5DB' }}
                dy={20}
              />
              <YAxis 
                hide={true}
              />
              
              <Tooltip 
                cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                contentStyle={{ 
                  borderRadius: '32px', 
                  border: 'none', 
                  boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                  fontSize: '15px',
                  fontWeight: '900',
                  padding: '24px',
                  background: '#fff'
                }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#EF4444' }}
              />
              
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#EF4444" 
                strokeWidth={6} 
                fillOpacity={1} 
                fill="url(#premiumGradient)" 
                animationDuration={3000}
                activeDot={{ r: 10, fill: '#EF4444', strokeWidth: 5, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* AI Performance Insights */}
      <section className="px-8 mt-16 space-y-8">
         <div className="p-9 bg-gray-50/50 rounded-[3rem] border border-gray-100 flex items-start gap-6 hover:bg-blue-50 transition-colors duration-700">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-md flex-shrink-0">
               <span className="text-3xl">🤖</span>
            </div>
            <div>
               <h4 className="text-xl font-black text-[#191f28] mb-1.5 flex items-center gap-2">
                  AI 인텔리전스 리포트
                  <Info size={16} className="text-[#3182f6]" />
               </h4>
               <p className="text-sm font-bold text-gray-400 leading-relaxed tracking-tight">
                  이 종목은 최근 5거래일간 **기관의 집중적인 매수세**가 확인되었습니다. 
                  기술적 분석 결과 RSI 과매수 구간에 진입했으나, 수급 강도가 이를 압도하고 있습니다. 
                  목표 수익률 12%를 유지하십시오.
               </p>
            </div>
         </div>

         {/* Advanced Metrics Grid */}
         <div className="grid grid-cols-2 gap-5">
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Profitability</span>
               <div className="text-3xl font-black text-[#EF4444] tracking-tighter">92%</div>
               <span className="text-[10px] font-bold text-red-300 mt-2">Optimal Zone</span>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Volatility</span>
               <div className="text-3xl font-black text-blue-500 tracking-tighter">Low</div>
               <span className="text-[10px] font-bold text-blue-300 mt-2">Safe Trading</span>
            </div>
         </div>
      </section>
    </div>
  );
}
