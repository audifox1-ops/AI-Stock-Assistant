"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, BarChart3, Bot, Sparkles, Loader2, Info, ChevronRight, X, 
  TrendingUp, TrendingDown, Activity, Zap, Star, LayoutGrid, List as ListIcon, 
  LineChart as LineChartIcon, PieChart, Lightbulb, ShieldAlert, Target, Search,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface NaverStock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  volume: string;
  high52w: string;
  low52w: string;
  targetPrice: string | number;
  upsidePotential: string;
  opinion: string;
}

interface IndexData {
  name: string;
  price: string;
  changePrice: string;
  changeRate: string;
  isUp: boolean;
}

export default function HomePage() {
  // --- 상태 관리 ---
  const [marketIndices, setMarketIndices] = useState<IndexData[]>([]);
  const [rankingStocks, setRankingStocks] = useState<NaverStock[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [rankingType, setRankingType] = useState('marketValue'); 
  const [rankingCategory, setRankingCategory] = useState('KOSPI');

  // 인터랙션 상태
  const [selectedStock, setSelectedStock] = useState<NaverStock | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiMode, setAiMode] = useState<'analysis' | 'strategy'>('analysis');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // --- 데이터 패칭 ---
  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (e) {}
  };

  const fetchNaverRanking = async () => {
    setIsRankingLoading(true);
    try {
      const res = await fetch(`/api/naver?type=${rankingType}&category=${rankingCategory}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setRankingStocks(data);
    } catch (e) {}
    finally { setIsRankingLoading(false); }
  };

  useEffect(() => {
    fetchMarket();
    fetchNaverRanking();
    const interval = setInterval(() => {
      fetchMarket();
    }, 60000);
    return () => clearInterval(interval);
  }, [rankingType, rankingCategory]);

  // --- 종목 선택 및 차트/AI 호출 ---
  const handleStockClick = (stock: NaverStock) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/naver?mode=chart&itemCode=${selectedStock.itemCode}`);
      const data = await res.json();
      if (data.price) {
        setChartData(data.price.map((p: any) => ({
          time: p.localDate.substring(4, 8),
          price: p.closePrice
        })));
      }
    } catch (e) {}
    finally { setIsChartLoading(false); }
  };

  const openAi = async (mode: 'analysis' | 'strategy') => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('ai');
    setAiMode(mode);
    setIsAiLoading(true);
    setAiAnalysis(null);
    
    const instruction = mode === 'analysis' 
      ? `현재가 ${selectedStock.closePrice}, 거래량 ${selectedStock.volume} 데이터를 바탕으로 이 기업의 현재 상황과 펀더멘털을 3줄로 팩트 위주로 분석해.`
      : `현재가 ${selectedStock.closePrice}, 목표가 ${selectedStock.targetPrice} 데이터를 바탕으로 지금 매수/매도/관망 중 어떤 포지션이 유리한지 실전 투자 전략을 3줄로 과감하게 제시해.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.itemCode,
          name: selectedStock.stockName,
          price: selectedStock.closePrice,
          changePercent: selectedStock.fluctuationsRatio,
          instruction
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally { setIsAiLoading(false); }
  };

  return (
    <div className="w-full relative min-h-screen bg-slate-50 font-sans pb-10">
      <header className="px-6 py-6 bg-white flex justify-between items-center sticky top-0 z-40 border-b border-gray-100">
        <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={28} /> STOCK
        </h1>
        <button onClick={() => { fetchMarket(); fetchNaverRanking(); }} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-95 transition-all">
          <RefreshCcw size={20} className={isRankingLoading ? 'animate-spin text-blue-500' : ''} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-8">
        {/* Market Board */}
        <section className="grid grid-cols-2 gap-4">
           {marketIndices.length === 0 ? (
             [1,2].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>)
           ) : marketIndices.map(m => (
             <div key={m.name} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col justify-between h-36 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/30 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.name}</p>
                   {m.isUp ? <TrendingUp size={14} className="text-red-400" /> : <TrendingDown size={14} className="text-blue-400" />}
                </div>
                <div className="relative z-10">
                   <h2 className={`text-[1.75rem] font-black tabular-nums tracking-tighter ${m.isUp ? 'text-red-500' : 'text-blue-500'}`}>{m.price}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-black ${m.isUp ? 'text-red-400' : 'text-blue-400'}`}>{m.isUp ? '▲' : '▼'} {m.changePrice}</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${m.isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{m.changeRate}%</span>
                   </div>
                </div>
             </div>
           ))}
        </section>

        {/* TOP 30 Rankings */}
        <section className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden flex flex-col">
           <div className="p-8 border-b border-gray-50 flex justify-between items-end bg-slate-50/20">
              <div className="space-y-1">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={18} className="text-red-500" /> Market Pulse
                 </h3>
                 <p className="text-[11px] font-bold text-slate-300">Touch stock for AI Deep Insights</p>
              </div>
              <div className="flex p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                 <button onClick={() => setRankingCategory('KOSPI')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSPI' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>KOSPI</button>
                 <button onClick={() => setRankingCategory('KOSDAQ')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSDAQ' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>KOSDAQ</button>
              </div>
           </div>

           <div className="px-6 py-5 flex gap-3 overflow-x-auto no-scrollbar border-b border-gray-50">
              {['marketValue', 'search', 'volume'].map(type => (
                <button key={type} onClick={() => setRankingType(type)} className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === type ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400'}`}>
                  {type === 'marketValue' ? '시총상위' : type === 'search' ? '인기검색' : '거래량상위'}
                </button>
              ))}
           </div>

           <div className="p-4 space-y-3">
              {isRankingLoading ? (
                <div className="py-32 text-center flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Compiling Data...</p>
                </div>
              ) : rankingStocks.slice(0, 30).map((rs, idx) => {
                const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                return (
                  <div key={rs.itemCode} onClick={() => handleStockClick(rs)} className="p-6 bg-white rounded-[2.25rem] border border-gray-50 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all hover:bg-slate-50">
                     <div className="flex items-center gap-5">
                        <span className="text-[14px] font-black text-slate-200 group-hover:text-blue-500 transition-colors w-6">{idx + 1}</span>
                        <div>
                           <h4 className="text-[18px] font-black text-slate-900 tracking-tighter leading-tight">{rs.stockName}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{rs.itemCode}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                              <span className="text-[10px] font-black text-slate-400">거래량: {rs.volume}</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-[20px] font-black text-slate-900 tracking-tighter leading-none">{rs.closePrice}</p>
                        <span className={`text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1 ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                           {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                        </span>
                     </div>
                  </div>
                );
              })}
           </div>
        </section>
      </div>

      {/* 실시간 종목 바텀 시트 */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-6 pb-12">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-100 rounded-full"></div>
              
              <div className="flex items-center justify-between mb-10 mt-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedStock.stockName}</h3>
                    <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">{selectedStock.itemCode} · {selectedStock.closePrice}원</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[1.75rem] group hover:bg-blue-600 transition-all active:scale-95"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <LineChartIcon size={24} />
                       </div>
                       <div className="text-left">
                          <p className="text-base font-black uppercase tracking-widest leading-none">📊 차트 보기</p>
                          <p className="text-[10px] text-white/50 font-bold mt-1.5">실시간 시황 데이터 시각화</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-white/30 group-hover:text-white" />
                 </button>

                 <div className="grid grid-cols-2 gap-4 mt-2">
                    <button 
                      onClick={() => openAi('analysis')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Bot size={28} className="text-slate-900 group-hover:text-blue-600" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500">AI 분석</span>
                    </button>
                    <button 
                      onClick={() => openAi('strategy')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Lightbulb size={28} className="text-slate-900 group-hover:text-blue-600" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500">매매 전략</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 데이터 모달 (차트/AI) */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[440px] rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                       {activeModal === 'chart' ? 'Market Chart' : aiMode === 'analysis' ? 'AI Deep Analysis' : 'AI Investment Strategy'}
                    </h2>
                    <p className="text-[10px] font-black text-blue-500 mt-1 uppercase tracking-widest">{selectedStock.stockName} · {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
              </div>

              <div className="min-h-[300px] flex flex-col justify-center">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full mt-4">
                      {isChartLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                           <Loader2 className="animate-spin text-blue-100" size={48} />
                           <p className="text-[10px] font-black text-slate-200 tracking-widest uppercase">Streaming Real-time Data...</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                 <linearGradient id="popChartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                              <Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#popChartGrad)" animationDuration={1000} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                      <div className="grid grid-cols-3 gap-2 mt-8">
                         <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">52w High</p>
                            <p className="text-xs font-black text-slate-900">{selectedStock.high52w}</p>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">52w Low</p>
                            <p className="text-xs font-black text-slate-900">{selectedStock.low52w}</p>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Volume</p>
                            <p className="text-xs font-black text-slate-900">{selectedStock.volume}</p>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="min-h-[220px]">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                           <Loader2 className="animate-spin text-blue-600" size={40} />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Generating Neural Insight...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <div className="bg-blue-50/30 rounded-[2rem] p-8 border border-blue-50/50">
                              <p className="text-base font-bold leading-relaxed text-gray-800 whitespace-pre-wrap tracking-tight">
                                 {aiAnalysis}
                              </p>
                           </div>
                           <p className="text-[10px] font-bold text-slate-300 mt-6 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                              <ShieldAlert size={12} /> Data based on Gemini 2.5 Flash Intelligence.
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button onClick={() => setActiveModal(null)} className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-slate-200 mt-8 uppercase tracking-widest text-xs">
                   Confirm & Close
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
