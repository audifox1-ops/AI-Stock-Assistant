"use client";

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ChevronLeft, Bot, Loader2, AlertCircle, HelpCircle, RefreshCcw, 
  Search, TrendingUp, TrendingDown, Target, Zap
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ChartDataPoint {
  time: string;
  price: number;
}

interface SelectedStock {
  name: string;
  symbol: string;
}

const DEFAULT_STOCKS: SelectedStock[] = [
  { name: "태웅", symbol: "044490" },
  { name: "삼성전자", symbol: "005930" },
  { name: "SK하이닉스", symbol: "000660" },
  { name: "카카오", symbol: "035720" },
  { name: "에코프로", symbol: "086520" }
];

export default function ChartPage() {
  const [selectedStock, setSelectedStock] = useState<SelectedStock>(DEFAULT_STOCKS[0]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [watchlist, setWatchlist] = useState<SelectedStock[]>([]);

  // 관심종목 로드
  useEffect(() => {
    const saved = localStorage.getItem('myWatchlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mapped = parsed.map((s: any) => ({ 
          name: s.name, 
          symbol: s.symbol.replace('.KS', '').replace('.KQ', '') 
        }));
        setWatchlist(mapped);
      } catch (e) {}
    }
  }, []);

  // 종목 변경 시 데이터 패칭
  useEffect(() => {
    fetchData();
  }, [selectedStock]);

  const fetchData = async () => {
    setIsChartLoading(true);
    setIsAiLoading(true);
    setAnalysis(null);
    setErrorStatus(null);
    
    try {
      // 1. 차트 데이터 패칭 (네이버 프록시)
      const chartRes = await fetch(`/api/naver?mode=chart&itemCode=${selectedStock.symbol}`, { cache: 'no-store' });
      const chartRaw = await chartRes.json();
      
      if (chartRaw.price) {
        const formatted = chartRaw.price.map((p: any) => ({
          time: p.localDate.substring(4, 8), // MMDD
          price: p.closePrice
        }));
        setChartData(formatted);
      }

      // 2. AI 분석 패칭
      const aiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: selectedStock.symbol, 
          name: selectedStock.name,
          instruction: "현재 차트 데이터와 변동 추이를 바탕으로 향후 1주일간의 주가 흐름을 기술적 지표 중심으로 분석하고, 매매 전략을 3줄로 요약해줘."
        }),
        cache: 'no-store'
      });
      const aiResult = await aiRes.json();
      setAnalysis(aiResult.analysis || aiResult.error);
    } catch (e: any) {
      setErrorStatus("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsChartLoading(false);
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      <header className="px-5 py-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-40">
         <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400">
               <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Market Insight</h1>
         </div>
         <button onClick={fetchData} className="p-2 bg-slate-50 rounded-xl text-slate-400">
            <RefreshCcw size={18} className={isChartLoading || isAiLoading ? 'animate-spin' : ''} />
         </button>
      </header>

      <div className="px-5 mt-6 space-y-6">
         {/* 종목 선택 영역 */}
         <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
               <Search size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Select Asset to Explore</span>
            </div>
            <select 
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer"
              value={selectedStock.symbol}
              onChange={(e) => {
                const stock = [...DEFAULT_STOCKS, ...watchlist].find(s => s.symbol === e.target.value);
                if (stock) setSelectedStock(stock);
              }}
            >
               <optgroup label="Default Hot Stocks">
                  {DEFAULT_STOCKS.map(s => (
                    <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
                  ))}
               </optgroup>
               {watchlist.length > 0 && (
                 <optgroup label="From My Watchlist">
                    {watchlist.map(s => (
                      <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
                    ))}
                 </optgroup>
               )}
            </select>
         </section>

         {/* 차트 시각화 카드 */}
         <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedStock.name}</h2>
                  <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">{selectedStock.symbol} Historical Trend</p>
               </div>
               <div className="bg-blue-50 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Live Connect</span>
               </div>
            </div>

            <div className="h-[320px] w-full flex items-center justify-center">
               {isChartLoading ? (
                 <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-100" size={48} />
                    <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Streaming Time-series Data...</p>
                 </div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
                       <XAxis 
                         dataKey="time" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }}
                         minTickGap={30}
                       />
                       <YAxis hide domain={['auto', 'auto']} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }}
                         labelStyle={{ fontWeight: 900, color: '#94a3b8', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
                         itemStyle={{ fontWeight: 900, fontSize: '16px', color: '#0f172a' }}
                       />
                       <Area 
                         type="monotone" 
                         dataKey="price" 
                         stroke="#2563eb" 
                         strokeWidth={4} 
                         fillOpacity={1} 
                         fill="url(#chartGradient)" 
                         animationDuration={1500}
                       />
                    </AreaChart>
                 </ResponsiveContainer>
               )}
            </div>
         </section>

         {/* AI 리포트 카드 */}
         <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/10 blur-[120px] pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-black flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                     <Bot size={22} className="text-white" />
                  </div>
                  Strategic AI Diagnosis
               </h3>
               <div className="relative">
                  <HelpCircle 
                    size={20} 
                    className="text-slate-500 cursor-pointer hover:text-white transition-colors"
                    onClick={() => setShowTooltip(!showTooltip)}
                  />
                  {showTooltip && (
                    <div className="absolute right-0 top-10 w-64 bg-white text-slate-900 text-[11px] p-5 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 border border-slate-100">
                       <p className="font-black border-b border-slate-50 pb-2 mb-2 tracking-tighter uppercase text-blue-600">How it works</p>
                       <p className="font-bold leading-relaxed text-slate-500">
                          AI가 보조지표와 과거 패턴을 분석하여 향후 주차별 대응 전략을 3줄 핵심 요약으로 제시합니다.
                       </p>
                    </div>
                  )}
               </div>
            </div>

            <div className="min-h-[160px] flex flex-col justify-center">
               {isAiLoading ? (
                  <div className="flex flex-col items-center gap-5">
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
                        <Loader2 className="animate-spin text-white" size={32} />
                     </div>
                     <p className="text-[10px] font-black text-blue-100 tracking-[0.4em] uppercase">Processing Neural Data...</p>
                  </div>
               ) : errorStatus ? (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4">
                     <AlertCircle className="text-red-400 mt-1" size={20} />
                     <p className="text-sm font-bold text-red-200 leading-relaxed">{errorStatus}</p>
                  </div>
               ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                     <p className="text-[17px] font-bold leading-[1.8] text-slate-100 whitespace-pre-wrap tracking-tight">
                        {analysis || "종목을 선택하여 AI 정밀 분석 리포트를 생성하세요."}
                     </p>
                     <div className="mt-8 flex items-center gap-3 opacity-30">
                        <Target size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Analysis complete · Precision verified</span>
                     </div>
                  </div>
               )}
            </div>
         </section>

         <div className="pb-6">
            <Link 
              href="/" 
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-6 rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] shadow-sm border border-gray-100 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
               Return to Dashboard <ChevronLeft size={16} className="rotate-180" />
            </Link>
         </div>
      </div>
    </div>
  );
}
