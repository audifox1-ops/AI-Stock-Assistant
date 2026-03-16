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
import { RefreshCcw, TrendingUp } from 'lucide-react';

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

  // SSR Hydration 에러 방지를 위한 마운트 체크
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCcw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">시장 흐름</h1>
            <p className="text-sm font-bold text-gray-400">최근 7일간의 변동 추이</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* 대형 가격 정보 (최종 데이터 기준) */}
        <div className="mb-10 px-2">
          <p className="text-xs font-black text-gray-300 uppercase tracking-widest mb-1">Last Update Price</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black text-[#EF4444] tracking-tighter">52,500</h2>
            <span className="text-2xl font-black text-gray-500">{'원'}</span>
          </div>
          <p className="text-sm font-bold text-[#EF4444] mt-2 flex items-center gap-1">
            <span>+2,300 (4.6%)</span>
            <span className="text-[10px] animate-pulse">▲</span>
          </p>
        </div>
      </header>

      {/* Tosh-style Area Chart Section */}
      <section className="px-4 h-[350px] w-full mt-4">
        <div className="w-full h-full bg-white rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-50">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mockData}
              margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* 세련된 하단 그라데이션 필링 */}
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              {/* 극도로 깔끔한 점선 그리드 */}
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 8" 
                stroke="#F3F4F6" 
                className="opacity-50"
              />
              
              {/* 축 선(axisLine, tickLine)은 모두 제거하여 클린함 유지 */}
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 13, fontWeight: 800, fill: '#D1D5DB' }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 800, fill: '#D1D5DB' }}
              />
              
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  fontSize: '14px',
                  fontWeight: '900'
                }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#EF4444" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart Footer Info */}
      <section className="px-8 mt-12 space-y-6">
        <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <span className="text-xl">💡</span>
           </div>
           <div>
              <p className="text-xs font-black text-gray-400 mb-0.5">Investor Opinion</p>
              <h4 className="text-base font-extrabold text-[#111827]">시장이 매우 낙관적입니다</h4>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase mb-2">Highest</p>
              <p className="text-xl font-black text-[#EF4444]">52,500</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-300 uppercase mb-2">Lowest</p>
              <p className="text-xl font-black text-blue-500">46,800</p>
           </div>
        </div>
      </section>
    </div>
  );
}
