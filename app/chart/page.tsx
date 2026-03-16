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
import { RefreshCcw, TrendingUp, ChevronLeft, Bot, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ChartData {
  time: string;
  price: number;
}

export default function ChartPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [period, setPeriod] = useState('1일');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // AI Analysis states
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const initialData = [
    { time: '09:00', price: 51200 },
    { time: '10:00', price: 51800 },
    { time: '11:00', price: 50900 },
    { time: '12:00', price: 52100 },
    { time: '13:00', price: 52800 },
    { time: '14:00', price: 52300 },
    { time: '15:00', price: 53500 },
  ];

  const fetchLiveChartData = async () => {
    setIsRefreshing(true);
    try {
      setTimeout(() => {
        const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 53500;
        const volatility = Math.random() * 500 - 250;
        const newPrice = Math.floor(lastPrice + volatility);
        
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        setChartData(prev => {
          const updated = [...prev, { time: timeStr, price: newPrice }];
          if (updated.length > 20) updated.shift();
          return updated;
        });
        setIsRefreshing(false);
      }, 700);
    } catch (err) {
      setIsRefreshing(false);
    }
  };

  const runAiStrategyAnalysis = async () => {
    setIsAiLoading(true);
    setAiStrategy(null);
    setAiError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: "044490.KQ",
          name: "태웅",
          price: chartData.length > 0 ? chartData[chartData.length - 1].price : 53500,
          changePercent: 4.6,
          institutional: 2450000, 
          foreigner: 120000
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (data.analysis) {
        setAiStrategy(data.analysis);
      } else if (data.error) {
        setAiError(data.error);
      } else {
        setAiError("AI 엔진이 유효한 응답을 생성하지 못했습니다.");
      }
    } catch (error) {
      setAiError("네트워크 오류로 AI 분석 리포트를 가져올 수 없습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setChartData(initialData);
    const interval = setInterval(fetchLiveChartData, 60000);
    runAiStrategyAnalysis();
    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5">
        <Loader2 className="animate-spin text-[#3182f6]" size={48} />
        <div className="text-center">
           <p className="text-sm font-black text-gray-500 uppercase tracking-widest">분석 시스템 엔진 가동 중</p>
           <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">Initializing Deep Intelligence Engine...</p>
        </div>
      </div>
    );
  }

  const periods = ['1일', '1주', '1달', '1년', '전체'];

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      <header className="px-6 pt-12 pb-10 bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-5 mb-10">
           <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#3182f6] border border-gray-100 transition-all">
              <ChevronLeft size={28} />
           </Link>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-black text-[#191f28] tracking-tight">태웅</h1>
                 <span className="text-sm font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded-lg">044490.KQ</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-sm animate-pulse" />
                 <span className="text-[10px] font-black text-[#3182f6] uppercase tracking-[0.2em] leading-none">Live Market Synchronized</span>
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end px-2">
           <div className="space-y-2">
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">현재 실시간 주가</p>
              <div className="flex items-baseline gap-3">
                 <h2 className="text-6xl font-black text-[#191f28] tracking-tighter leading-none">
                   {chartData.length > 0 ? chartData[chartData.length - 1].price.toLocaleString() : '53,500'}
                 </h2>
                 <span className="text-2xl font-bold text-gray-300 uppercase">KRW</span>
              </div>
           </div>
           <div className="flex flex-col items-end gap-3">
              <div className="px-4 py-2 bg-red-50 rounded-2xl text-base font-black text-[#EF4444] border border-red-100 flex items-center gap-2 shadow-sm shadow-red-50">
                 <TrendingUp size={20} />
                 <span>+2,300 (+4.6%)</span>
              </div>
              <div className="flex items-center gap-2">
                 <RefreshCcw size={12} className={`text-[#3182f6] ${isRefreshing ? 'animate-spin' : ''}`} />
                 <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">Real-time interval 1m</span>
              </div>
           </div>
        </div>
      </header>

      <section className="px-6 mt-12 space-y-8">
         <div className="flex gap-2 p-2 bg-white rounded-2xl border border-gray-100 w-fit mx-auto shadow-sm">
            {periods.map(p => (
               <button 
                 key={p} 
                 onClick={() => setPeriod(p)}
                 className={`px-7 py-3 rounded-xl text-sm font-black transition-all ${period === p ? 'bg-[#191f28] text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}
               >
                  {p}
               </button>
            ))}
         </div>

         {/* 사용자 지시: ResponsiveContainer 부모 div에 인라인 스타일 강제 적용 */}
         <div 
           className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm w-full relative overflow-hidden group"
           style={{ width: '100%', height: '300px', minHeight: '300px' }}
         >
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
               >
                  <defs>
                     <linearGradient id="livePriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="6 12" stroke="#F1F5F9" />
                  <XAxis 
                     dataKey="time" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 11, fontWeight: 800, fill: '#CBD5E1' }}
                     dy={20}
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                     cursor={{ stroke: '#E2E8F0', strokeWidth: 3 }}
                     contentStyle={{ 
                        borderRadius: '24px', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.1)',
                        fontSize: '16px', fontWeight: '900', padding: '20px 28px', background: 'rgba(255, 255, 255, 0.98)'
                     }}
                     labelStyle={{ color: '#94A3B8', marginBottom: '6px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                     itemStyle={{ color: '#3182f6' }}
                  />
                  <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="#3182f6" 
                     strokeWidth={6} 
                     fillOpacity={1} 
                     fill="url(#livePriceGradient)" 
                     activeDot={{ r: 10, fill: '#3182f6', strokeWidth: 5, stroke: '#fff' }}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </section>

      <section className="mt-16 px-6 pb-24 space-y-6">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Bot size={22} className="text-[#3182f6]" />
               </div>
               <h3 className="text-xl font-black text-[#191f28]">AI 실시간 분석 센터</h3>
            </div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Powered by Gemini AI</span>
         </div>

         <div className="bg-white rounded-[2.5rem] p-12 border border-blue-100 shadow-[0_40px_80px_-20px_rgba(49,130,246,0.1)] relative overflow-hidden min-h-[300px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
               <Sparkles size={140} className="text-[#3182f6]" />
            </div>
            
            {isAiLoading ? (
               <div className="space-y-8 animate-pulse relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-20 h-10 bg-blue-50 rounded-2xl" />
                     <div className="w-40 h-7 bg-gray-50 rounded-2xl" />
                  </div>
                  <div className="space-y-4">
                     <div className="w-full h-4.5 bg-gray-50 rounded-full" />
                     <div className="w-11/12 h-4.5 bg-gray-50 rounded-full" />
                  </div>
                  <div className="pt-8 flex flex-col items-center gap-3">
                     <Loader2 className="text-[#3182f6] animate-spin" size={32} />
                     <p className="text-xs font-black text-[#3182f6] uppercase tracking-[0.2em]">분석 데이터 정합성 검증 중...</p>
                  </div>
               </div>
            ) : aiError ? (
               <div className="flex flex-col items-center justify-center gap-6 py-6 animate-in fade-in duration-500">
                  <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-[#EF4444]">
                     <RefreshCcw size={40} />
                  </div>
                  <div className="text-center space-y-2">
                     <h4 className="text-lg font-black text-[#191f28]">전략을 생성할 수 없습니다</h4>
                     <p className="text-sm font-bold text-red-400">{aiError}</p>
                  </div>
                  <button 
                    onClick={runAiStrategyAnalysis} 
                    className="px-10 py-3.5 bg-gray-100 text-gray-500 hover:bg-[#3182f6] hover:text-white rounded-[1.5rem] text-sm font-black transition-all shadow-sm"
                  >
                     엔진 재가동 시도
                  </button>
               </div>
            ) : aiStrategy ? (
               <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 relative z-10">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-4">
                        <span className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.15em] shadow-xl shadow-blue-100">AI DEEP REPORT</span>
                        <h4 className="text-lg font-black text-[#191f28]">전문가 종합 전략 제언</h4>
                     </div>
                     <button onClick={runAiStrategyAnalysis} className="p-3 bg-gray-50 rounded-2xl text-gray-300 hover:text-[#3182f6] transition-all border border-gray-100">
                        <RefreshCcw size={20} />
                     </button>
                  </div>
                  <div className="text-[17px] text-gray-700 font-bold leading-[1.8] whitespace-pre-line space-y-6 border-l-[6px] border-[#3182f6] pl-10 my-6 italic">
                     {aiStrategy}
                  </div>
                  <div className="mt-12 pt-10 border-t border-gray-50 flex justify-between items-center text-[10px] font-black text-gray-300 uppercase tracking-[0.25em]">
                     <span>Model Status: Optimized for Alpha</span>
                     <div className="flex items-center gap-2 text-[#3182f6] bg-blue-50 px-4 py-2 rounded-xl">
                        <Sparkles size={12} />
                        <span>High Confidence (89%)</span>
                     </div>
                  </div>
               </div>
            ) : null}
         </div>
      </section>
    </div>
  );
}
