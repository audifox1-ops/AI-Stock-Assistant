"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Search, ChevronLeft, ChevronRight, Star, Trash2, Plus, Loader2, Bot, 
  TrendingUp, TrendingDown, X, LineChart as LineChartIcon, Lightbulb, ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import Link from 'next/link';

// [9차 핵심] localStorage 키 정의
const STORAGE_KEY = 'myWatchlist';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
}

// 종목명 -> 티커 변환 맵핑 딕셔너리
const stockMap: Record<string, string> = { 
  "태웅": "044490.KQ", 
  "삼성전자": "005930.KS", 
  "SK하이닉스": "000660.KS", 
  "카카오": "035720.KS", 
  "에코프로": "086520.KQ",
  "네이버": "035420.KS",
  "현대차": "005380.KS",
  "LG에너지솔루션": "373220.KS",
  "삼성바이오로직스": "207940.KS"
};

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // 인터랙션 상태
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiMode, setAiMode] = useState<'analysis' | 'strategy'>('analysis');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // 시세 정보 실시간 업데이트 기능
  const fetchPrices = async (stocksToUpdate: InterestStock[]) => {
    if (stocksToUpdate.length === 0) return;
    setIsLoadingPrices(true);
    try {
      const symbols = stocksToUpdate.map(s => s.symbol);
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();
      const updated = stocksToUpdate.map(s => {
        const live = data[s.symbol];
        if (live) return { ...s, price: live.price, change: live.changePercent };
        return s;
      });
      setInterestStocks(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInterestStocks(parsed);
        fetchPrices(parsed);
      } catch (e) {}
    }
  }, []);

  const handleAddStock = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    const symbol = stockMap[trimmedQuery];
    if (!symbol) {
       alert("종목을 찾을 수 없습니다.");
       return;
    }
    setIsSubmitting(true);
    if (interestStocks.some(s => s.symbol === symbol)) {
      alert("이미 추가된 종목입니다.");
      setSearchQuery('');
      setIsSubmitting(false);
      return;
    }
    const newStock: InterestStock = {
      id: Date.now(),
      name: trimmedQuery,
      symbol: symbol,
      price: null,
      change: null
    };
    const updatedList = [newStock, ...interestStocks];
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    setSearchQuery('');
    fetchPrices(updatedList);
    setTimeout(() => setIsSubmitting(false), 300);
  };

  const removeInterest = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    const updatedList = interestStocks.filter(s => s.id !== id);
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  };

  // --- 바텀 시트 및 모달 로직 ---
  const handleStockClick = (stock: InterestStock) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setIsChartLoading(true);
    const itemCode = selectedStock.symbol.split('.')[0];
    try {
      const res = await fetch(`/api/naver?mode=chart&itemCode=${itemCode}`);
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
    
    const itemCode = selectedStock.symbol.split('.')[0];
    const instruction = mode === 'analysis' 
      ? `관심종목 ${selectedStock.name}의 현재 상황과 미래 가치를 3줄 팩트 분석해줘.`
      : `${selectedStock.name} 종목에 대해 지금 추가 매수할지, 비중을 줄일지 실전 투자 전략을 3줄로 제시해줘.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: itemCode,
          name: selectedStock.name,
          price: selectedStock.price,
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
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-40">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Watchlist</h1>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Personal Assets Control</p>
        </div>
        <button onClick={() => fetchPrices(interestStocks)} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
           <RefreshCcw size={20} className={isLoadingPrices ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-8">
         {/* 검색 및 추가 */}
         <div className="flex gap-3">
            <div className="bg-white rounded-[1.75rem] px-6 h-16 flex items-center gap-4 border border-gray-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 flex-1 transition-all">
               <Search className="text-slate-300" size={22} />
               <input 
                 type="text" 
                 placeholder="Search Stock Name..." 
                 className="bg-transparent border-none outline-none font-bold text-base text-slate-900 w-full placeholder:text-gray-300"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleAddStock()}
               />
            </div>
            <button 
              onClick={handleAddStock}
              disabled={isSubmitting}
              className="w-16 h-16 bg-blue-600 text-white rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-blue-100 active:scale-95 transition-all"
            >
               {isSubmitting ? <Loader2 className="animate-spin" size={26} /> : <Plus size={26} />}
            </button>
         </div>

         {/* 관심 리스트 */}
         <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Favorite Assets</h3>
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Syncing...</span>
            </div>
            
            {interestStocks.length === 0 ? (
               <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">
                  <Star size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No saved assets found</p>
               </div>
            ) : interestStocks.map(s => {
              const isUp = (s.change || 0) >= 0;
              return (
                <div key={s.id} onClick={() => handleStockClick(s)} className="bg-white p-7 rounded-[2.25rem] shadow-sm border border-gray-100 flex justify-between items-center group active:scale-[0.98] transition-all hover:border-blue-100 relative overflow-hidden">
                   <div className="flex items-center gap-5 relative z-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                         <Star size={24} fill="currentColor" className="opacity-80" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-[18px] font-black text-slate-900 truncate tracking-tight">{s.name}</h4>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.symbol}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 relative z-10">
                      <div className="text-right flex flex-col items-end gap-2">
                         <p className="text-[20px] font-black text-slate-900 tabular-nums leading-none tracking-tighter">
                            {s.price ? s.price.toLocaleString() : '--'}
                         </p>
                         <span className={`text-[11px] font-black px-3 py-1 rounded-xl ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {s.change !== null ? (isUp ? '+' : '') + s.change?.toFixed(2) + '%' : 'Connecting...'}
                         </span>
                      </div>
                      <button 
                        onClick={(e) => removeInterest(e, s.id)} 
                        className="p-3 bg-slate-50 rounded-2xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all"
                       >
                         <Trash2 size={20} />
                      </button>
                   </div>
                </div>
              );
            })}
         </div>
      </div>

      {/* 바텀 시트 */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-6 pb-12">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-100 rounded-full"></div>
              
              <div className="flex items-center justify-between mb-10 mt-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedStock.name}</h3>
                    <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">{selectedStock.symbol}</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-7 bg-slate-900 text-white rounded-[2rem] group hover:bg-blue-600 transition-all active:scale-95"
                 >
                    <div className="flex items-center gap-4">
                       <LineChartIcon size={24} className="text-white" />
                       <div className="text-left">
                          <p className="text-base font-black uppercase tracking-widest leading-none">📊 차트 보기 미리보기</p>
                          <p className="text-[10px] text-white/50 font-bold mt-1.5">실시간 시황 데이터 시각화</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-white/30 group-hover:text-white" />
                 </button>

                 <div className="grid grid-cols-2 gap-4 mt-2">
                    <button 
                      onClick={() => openAi('analysis')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.25rem] hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Bot size={28} className="text-slate-900 group-hover:text-blue-600" />
                       <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">AI 분석</span>
                    </button>
                    <button 
                      onClick={() => openAi('strategy')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.25rem] hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Lightbulb size={28} className="text-slate-900 group-hover:text-blue-600" />
                       <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">매매 전략</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 데이터 모달 */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[440px] rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                       {activeModal === 'chart' ? 'Asset Chart' : 'AI Neural Guide'}
                    </h2>
                    <p className="text-[10px] font-black text-blue-500 mt-1 uppercase tracking-widest">{selectedStock.name} · {selectedStock.symbol}</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
              </div>

              <div className="min-h-[300px] flex flex-col justify-center">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full">
                      {isChartLoading ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-20">
                           <Loader2 className="animate-spin text-blue-100" size={48} />
                           <p className="text-[10px] font-black text-slate-200 tracking-[0.3em] uppercase">Compiling Historical Data...</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                 <linearGradient id="watchChartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#f1f5f9" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                              <Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#watchChartGrad)" animationDuration={1000} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                 ) : (
                   <div>
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                           <Loader2 className="animate-spin text-blue-600" size={40} />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Processing AI Logic...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <div className="bg-blue-50/30 rounded-[2rem] p-10 border border-blue-50/50">
                              <p className="text-base font-bold leading-[1.8] text-gray-800 whitespace-pre-wrap tracking-tight">
                                 {aiAnalysis}
                              </p>
                           </div>
                           <p className="text-[10px] font-bold text-slate-300 mt-8 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                              <ShieldAlert size={12} /> Real-time Gemini 2.5 Intelligence Verified.
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button onClick={() => setActiveModal(null)} className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-slate-200 mt-10 uppercase tracking-widest text-xs">
                   Understand & Close
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
