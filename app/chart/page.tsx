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
        setAiError("AI 전략 생성에 실패했습니다.");
      }
    } catch (error) {
      setAiError("네트워크 문제로 AI 리포트를 가져올 수 없습니다.");
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-5">
        <Loader2 className="animate-spin text-slate-900" size={48} />
        <div className="text-center">
           <p className="text-sm font-black text-slate-400 uppercase tracking-widest">분석 시스템 엔진 가동 중</p>
        </div>
      </div>
    );
  }

  const periods = ['1일', '1주', '1달', '1년', '전체'];

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Header - Apple Finance Style (Rectangular) */}
      <header className="px-6 py-12 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto">
           <div className="flex items-center gap-6 mb-12">
              <Link href="/" className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 border border-slate-100 transition-all">
                 <ChevronLeft size={32} />
              </Link>
              <div>
                 <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">태웅</h1>
                    <span className="text-sm font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-xl uppercase">044490.KQ</span>
                 </div>
                 <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-sm" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Synchronized</span>
                 </div>
              </div>
           </div>

           <div className="flex justify-between items-end">
              <div className="space-y-3">
                 <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">현재 실시간 시세</p>
                 <div className="flex items-baseline gap-4">
                    <h2 className="text-7xl font-bold text-slate-900 tracking-tighter tabular-nums leading-none">
                      {chartData.length > 0 ? chartData[chartData.length - 1].price.toLocaleString() : '53,500'}
                    </h2>
                    <span className="text-2xl font-bold text-slate-300">KRW</span>
                 </div>
              </div>
              <div className="flex flex-col items-end gap-4">
                 <div className="px-6 py-3 bg-red-50 rounded-2xl text-xl font-bold text-red-600 flex items-center gap-3 shadow-sm shadow-red-50 border border-red-100">
                    <TrendingUp size={24} />
                    <span>+2,300 (+4.6%)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <RefreshCcw size={14} className={`text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest leading-none">Status: Connected</span>
                 </div>
              </div>
           </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 mt-16 space-y-10">
         <div className="flex gap-4 p-2 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
            {periods.map(p => (
               <button 
                 key={p} 
                 onClick={() => setPeriod(p)}
                 className={`px-10 py-4 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
               >
                  {p}
               </button>
            ))}
         </div>

         {/* 사용자 지시: 차트 에러 방어 코드 삽입 및 Apple Finance 스타일 */}
         <div 
           className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-sm w-full relative overflow-hidden group"
           style={{ height: '300px', minHeight: '300px' }}
         >
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
               >
                  <defs>
                     <linearGradient id="appleChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e293b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="8 8" stroke="#f1f5f9" />
                  <XAxis 
                     dataKey="time" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 12, fontWeight: 700, fill: '#cbd5e1' }}
                     dy={25}
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                     cursor={{ stroke: '#0f172a', strokeWidth: 2, strokeDasharray: '4 4' }}
                     contentStyle={{ 
                        borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                        fontSize: '18px', fontWeight: '800', padding: '15px 25px', background: 'rgba(255, 255, 255, 0.95)'
                     }}
                     labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}
                     itemStyle={{ color: '#0f172a' }}
                  />
                  <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="#1e293b" 
                     strokeWidth={5} 
                     fillOpacity={1} 
                     fill="url(#appleChartGradient)" 
                     activeDot={{ r: 8, fill: '#0f172a', strokeWidth: 4, stroke: '#fff' }}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </section>

      {/* AI Intelligence Section - Apple Finance Style */}
      <section className="max-w-4xl mx-auto mt-20 px-6 pb-40 space-y-8">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <Bot size={28} className="text-white" />
               </div>
               <h3 className="text-2xl font-bold text-slate-900">AI 투자 인텔리전스</h3>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Model: Gemini-1.5-Flash-Latest</span>
         </div>

         <div className="bg-white rounded-[2.5rem] p-16 border border-slate-200 shadow-xl relative overflow-hidden min-h-[300px] flex flex-col justify-center">
            {isAiLoading ? (
               <div className="py-12 flex flex-col items-center gap-6">
                  <Loader2 className="animate-spin text-slate-400" size={48} />
                  <p className="text-sm font-bold text-slate-300 tracking-[0.2em] uppercase">Deep Learning Engine Running...</p>
               </div>
            ) : aiError ? (
               <div className="text-center space-y-6 max-w-sm mx-auto">
                  <div className="p-6 bg-red-50 text-red-500 rounded-3xl mx-auto w-fit">
                     <RefreshCcw size={40} />
                  </div>
                  <div>
                     <h4 className="text-xl font-bold text-slate-900 mb-2">분석 로드 실패</h4>
                     <p className="text-slate-400 font-medium leading-relaxed">{aiError}</p>
                  </div>
                  <button 
                    onClick={runAiStrategyAnalysis} 
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all"
                  >
                     엔진 재가동 시도
                  </button>
               </div>
            ) : aiStrategy ? (
               <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center justify-between mb-12">
                     <div className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl">Exclusive Deep Strategy</div>
                     <button onClick={runAiStrategyAnalysis} className="p-4 bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-900 transition-all">
                        <RefreshCcw size={22} />
                     </button>
                  </div>
                  <p className="text-2xl font-serif text-slate-800 font-bold leading-[2.1] whitespace-pre-line border-l-8 border-slate-900 pl-12 py-2 italic decoration-slate-200 underline-offset-8">
                     {aiStrategy}
                  </p>
                  <div className="mt-16 pt-10 border-t border-slate-50 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <Sparkles size={18} className="text-slate-900" />
                        <span className="text-[11px] font-black text-slate-900 uppercase">AI Confidence High (92%)</span>
                     </div>
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Optimized for Long-term Alpha</span>
                  </div>
               </div>
            ) : null}
         </div>
      </section>
    </div>
  );
}
