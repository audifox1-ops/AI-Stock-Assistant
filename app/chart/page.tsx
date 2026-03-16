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
import { RefreshCcw, TrendingUp, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

// --- Mock Data: 최근 1주일 종가 추이 ---
const mockData = [
  { name: '월', price: 47200 },
  { name: '화', price: 48500 },
  { name: '수', price: 46800 },
  { name: '목', price: 49200 },
  { name: '금', price: 51000 },
  { name: '토', price: 50200 },
  { name: '일', price: 52500 },
];

export default function ChartPage() {
  const [isMounted, setIsMounted] = useState(false);

  // SSR Hydration 에러 방지를 위한 클라이언트 마운트 가드
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCcw className="animate-spin text-[#3182f6]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Chart Header */}
      <header className="px-6 pt-12 pb-8 bg-white sticky top-0 z-20 border-b border-gray-50/50">
        <div className="flex items-center gap-4 mb-10">
          <Link href="/" className="p-3 bg-gray-50 rounded-full text-gray-400 active:scale-90 transition-all">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex-1">
             <h1 className="text-2xl font-black text-[#191f28] tracking-tight">수익률 리포트</h1>
             <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-1">Market Trend Analysis</p>
          </div>
        </div>

        {/* Big Price Display */}
        <div className="px-2">
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-5xl font-black text-[#EF4444] tracking-tighter">52,500</h2>
            <span className="text-2xl font-black text-gray-400">원</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-[#EF4444]">
            <TrendingUp size={16} />
            <span>+2,300 (+4.6%)</span>
            <span className="px-2 py-0.5 bg-red-50 rounded-md text-[10px] uppercase">Bullish</span>
          </div>
        </div>
      </header>

      {/* Main Area Chart Section */}
      <section className="px-4 mt-12 w-full h-[400px]">
        <div className="w-full h-full bg-white rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-gray-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-50/10 to-transparent pointer-events-none" />
          
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mockData}
              margin={{ top: 30, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="4 10" 
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
                  borderRadius: '24px', 
                  border: 'none', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                  fontSize: '14px',
                  fontWeight: '900',
                  padding: '16px'
                }}
                itemStyle={{ color: '#EF4444' }}
              />
              
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#EF4444" 
                strokeWidth={5} 
                fillOpacity={1} 
                fill="url(#chartGradient)" 
                animationDuration={2500}
                activeDot={{ r: 8, fill: '#EF4444', strokeWidth: 4, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Insight Section */}
      <section className="px-8 mt-16 space-y-6">
         <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-start gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
               <span className="text-2xl">🔥</span>
            </div>
            <div>
               <h4 className="text-lg font-black text-[#191f28] mb-1">인공지능 분석 결과</h4>
               <p className="text-sm font-bold text-gray-400 leading-relaxed">자산의 장기적인 추세가 매우 견고합니다. 현재의 변동성은 매수 기회로 작용할 가능성이 78% 이상입니다.</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-2">Max Profit</span>
               <p className="text-2xl font-black text-[#EF4444] tracking-tighter">+5,300원</p>
            </div>
            <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-2">Stability</span>
               <p className="text-2xl font-black text-blue-500 tracking-tighter">High</p>
            </div>
         </div>
      </section>
    </div>
  );
}
