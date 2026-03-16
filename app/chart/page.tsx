"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { RefreshCcw, TrendingUp, ChevronLeft, Calendar, Info, BarChart3, Bot, Sparkles, TrendingDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
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

  // Mock initial data
  const initialData = [
    { time: '09:00', price: 51200 },
    { time: '10:00', price: 51800 },
    { time: '11:00', price: 50900 },
    { time: '12:00', price: 52100 },
    { time: '13:00', price: 52800 },
    { time: '14:00', price: 52300 },
    { time: '15:00', price: 53500 },
  ];

  // 1분마다 실시간 데이터 폴링 로직
  const fetchLiveChartData = async () => {
    setIsRefreshing(true);
    try {
      // 실제 API 호출 (yahoo-finance2 등) - 여기서는 데모를 위해 변동성 부여
      setTimeout(() => {
        const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 52500;
        const newPrice = lastPrice + (Math.random() * 400 - 200);
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        setChartData(prev => {
          const updated = [...prev, { time: timeStr, price: Math.floor(newPrice) }];
          if (updated.length > 20) updated.shift();
          return updated;
        });
        setIsRefreshing(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setIsRefreshing(false);
    }
  };

  const runAiStrategyAnalysis = async () => {
    setIsAiLoading(true);
    setAiStrategy(null);
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
      });
      const data = await res.json();
      setAiStrategy(data.analysis);
    } catch (error) {
      setAiStrategy("AI 분석 리포트를 생성하는 데 실패했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setChartData(initialData);
    
    // 1분(60,000ms) 폴링 인터벌 설정
    const interval = setInterval(fetchLiveChartData, 60000);
    
    // 페이지 진입 시 AI 분석 실행
    runAiStrategyAnalysis();
    
    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <RefreshCcw className="animate-spin text-[#3182f6]" size={36} />
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">분석 로더 기동 중...</span>
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
              <div className="flex items-center gap-1.5 mt-1 px-1">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[9px] font-black text-[#3182f6] uppercase tracking-widest">Real-time Data Streaming</span>
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end px-2">
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">현재 주가</p>
              <div className="flex items-baseline gap-2">
                 <h2 className="text-5xl font-black text-[#191f28] tracking-tighter">
                   {chartData.length > 0 ? chartData[chartData.length - 1].price.toLocaleString() : '52,500'}
                 </h2>
                 <span className="text-xl font-bold text-gray-400">KRW</span>
              </div>
           </div>
           <div className="text-right flex flex-col items-end gap-1.5">
              <div className="px-3 py-1 bg-red-50 rounded-lg text-sm font-bold text-[#EF4444] flex items-center gap-1">
                 <TrendingUp size={16} />
                 <span>+2,300 (+4.6%)</span>
              </div>
              <button 
                onClick={fetchLiveChartData}
                className="flex items-center gap-1 text-[9px] font-bold text-gray-300 hover:text-[#3182f6] transition-colors"
              >
                 <RefreshCcw size={10} className={isRefreshing ? 'animate-spin' : ''} />
                 {isRefreshing ? 'Updating...' : 'Last updated 1m ago'}
              </button>
           </div>
        </div>
      </header>

      {/* 2. Chart Section */}
      <section className="px-6 mt-8 space-y-6">
         {/* Period Selection */}
         <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-100 w-fit mx-auto shadow-sm">
            {periods.map(p => (
               <button 
                 key={p} 
                 onClick={() => setPeriod(p)}
                 className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${period === p ? 'bg-[#3182f6] text-white shadow-md' : 'text-gray-400 hover:text-gray-700'}`}
               >
                  {p}
               </button>
            ))}
         </div>

         {/* Chart Box */}
         <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm h-[400px] relative overflow-hidden group">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
               >
                  <defs>
                     <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  
                  <CartesianGrid vertical={false} strokeDasharray="5 10" stroke="#F8FAFC" />
                  
                  <XAxis 
                     dataKey="time" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 11, fontWeight: 700, fill: '#CBD5E1' }}
                     dy={15}
                  />
                  <YAxis hide={true} />
                  
                  <Tooltip 
                     cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
                     contentStyle={{ 
                        borderRadius: '24px', border: 'none', boxShadow: '0 25px 45px rgba(0,0,0,0.08)',
                        fontSize: '15px', fontWeight: '900', padding: '16px 24px', background: 'rgba(255, 255, 255, 0.98)'
                     }}
                     labelStyle={{ color: '#94A3B8', marginBottom: '4px', fontSize: '10px', fontWeight: '900' }}
                     itemStyle={{ color: '#3182f6' }}
                  />
                  
                  <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="#3182f6" 
                     strokeWidth={5} 
                     fillOpacity={1} 
                     fill="url(#liveGradient)" 
                     activeDot={{ r: 9, fill: '#3182f6', strokeWidth: 4, stroke: '#fff' }}
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </section>

      {/* 3. 🤖 Gemini AI Investment Strategy Section */}
      <section className="mt-14 px-6 pb-20 space-y-6">
         <div className="flex items-center gap-2 px-1">
            <Bot size={22} className="text-[#3182f6]" />
            <h3 className="text-xl font-bold text-[#191f28]">🤖 Gemini AI 투자 전략</h3>
         </div>

         <div className="bg-white rounded-[2.5rem] p-10 border border-blue-100 shadow-[0_30px_60px_-15px_rgba(49,130,246,0.12)] relative overflow-hidden min-h-[260px]">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <Sparkles size={120} className="text-[#3182f6]" />
            </div>
            
            {isAiLoading ? (
               <div className="space-y-6 animate-pulse">
                  <div className="flex items-center gap-3">
                     <div className="w-16 h-8 bg-blue-50 rounded-xl" />
                     <div className="w-32 h-6 bg-gray-50 rounded-xl" />
                  </div>
                  <div className="space-y-3">
                     <div className="w-full h-4 bg-gray-50 rounded-full" />
                     <div className="w-5/6 h-4 bg-gray-50 rounded-full" />
                     <div className="w-3/4 h-4 bg-gray-50 rounded-full" />
                  </div>
                  <div className="pt-4 flex justify-center">
                     <Loader2 className="text-[#3182f6] animate-spin" size={24} />
                  </div>
               </div>
            ) : aiStrategy ? (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-[#3182f6] text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-blue-100">Live Strategy</span>
                        <h4 className="text-lg font-bold text-[#191f28]">종합 의견 리포트</h4>
                     </div>
                     <button onClick={runAiStrategyAnalysis} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#3182f6] transition-all">
                        <RefreshCcw size={18} />
                     </button>
                  </div>
                  <div className="text-base text-gray-600 font-bold leading-relaxed whitespace-pre-line space-y-4">
                     {aiStrategy}
                  </div>
                  <div className="mt-10 pt-8 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-300">
                     <span className="uppercase tracking-[0.2em]">Data Engine: Gemini-1.5-Flash</span>
                     <span className="bg-gray-50 px-3 py-1.5 rounded-lg text-[#3182f6]">매수 우위 의견</span>
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Bot size={56} className="text-gray-100" />
                  <p className="text-sm font-bold text-gray-300">투자 전략을 생성할 수 없습니다.</p>
                  <button onClick={runAiStrategyAnalysis} className="px-6 py-2.5 bg-blue-50 text-[#3182f6] rounded-xl text-xs font-bold">다시 시도</button>
               </div>
            )}
         </div>

         {/* Extra Analysis Grid */}
         <div className="grid grid-cols-2 gap-5">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 group hover:bg-red-50 transition-all duration-500">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">수급 밀집도</span>
               <div className="text-3xl font-black text-[#EF4444] tracking-tight">강력 매수</div>
               <div className="h-1.5 w-full bg-gray-50 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#EF4444] w-4/5 rounded-full" />
               </div>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-2 group hover:bg-blue-50 transition-all duration-500">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">차트 패턴</span>
               <div className="text-3xl font-black text-[#3B82F6] tracking-tight">우상향 중</div>
               <div className="h-1.5 w-full bg-gray-50 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#3B82F6] w-2/3 rounded-full" />
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
