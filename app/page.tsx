"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, BarChart3, Bot, Sparkles, Loader2, Info, ChevronRight, X, 
  TrendingUp, TrendingDown, Activity, Zap, Star, LayoutGrid, List as ListIcon, 
  LineChart as LineChartIcon, PieChart, Lightbulb, ShieldAlert, Target, Search,
  ArrowRight, Award, Flame, BarChart4
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
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  
  // [16차 & 18차] 확장된 6가지 탭 구성
  const [activeTab, setActiveTab] = useState('KOSPI');
  // API 전송용 매핑 (18차에서 /api/market?category= 형태로 통일)
  const tabMapping: Record<string, string> = {
    'KOSPI': 'KOSPI',
    'KOSDAQ': 'KOSDAQ',
    '거래량상위': '거래량상위',
    '거래량급증': '거래량급증',
    '거래량급락': '거래량급락',
    '골든크로스': '골든크로스'
  };

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
    const category = tabMapping[activeTab] || 'KOSPI';
    try {
      // [18차] /api/market 통합 엔드포인트 호출
      const res = await fetch(`/api/market?category=${category}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRankingStocks(data);
      } else {
        setRankingStocks([]);
      }
    } catch (e) {
      setRankingStocks([]);
    }
    finally { setIsRankingLoading(false); }
  };

  useEffect(() => {
    fetchMarket();
    fetchNaverRanking();
    const interval = setInterval(() => {
      fetchMarket();
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

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
      // 차트는 네이버 API 프록시 그대로 활용
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

  // 52주 고가 근접 지표 계산
  const getHighProximity = (current: string, high: string) => {
    const c = parseFloat(current.replace(/,/g, ''));
    const h = parseFloat(high.replace(/,/g, ''));
    if (!c || !h) return '-';
    return ((c / h) * 100).toFixed(1) + '%';
  };

  return (
    <div className="w-full relative min-h-screen bg-slate-50 font-sans pb-24">
      {/* 고정 헤더 */}
      <header className="px-6 py-6 bg-white flex justify-between items-center sticky top-0 z-40 border-b border-gray-100">
        <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={28} /> K-SMART
        </h1>
        <button onClick={() => { fetchMarket(); fetchNaverRanking(); }} className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:scale-95 transition-all">
          <RefreshCcw size={20} className={isRankingLoading ? 'animate-spin text-blue-500' : ''} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-8">
        {/* 지수 보드 */}
        <section className="grid grid-cols-2 gap-4">
           {marketIndices.length === 0 ? (
             [1,2].map(i => <div key={i} className="h-32 bg-white rounded-[2rem] animate-pulse shadow-sm"></div>)
           ) : marketIndices.map(m => (
             <div key={m.name} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col justify-between h-36 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/20 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700"></div>
                <div className="relative z-10 flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.name}</p>
                   {m.isUp ? <TrendingUp size={14} className="text-red-400" /> : <TrendingDown size={14} className="text-blue-400" />}
                </div>
                <div className="relative z-10">
                   <h2 className={`text-[1.8rem] font-black tabular-nums tracking-tighter ${m.isUp ? 'text-red-500' : 'text-blue-500'}`}>{m.price}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-black ${m.isUp ? 'text-red-400' : 'text-blue-400'}`}>{m.isUp ? '▲' : '▼'} {m.changePrice}</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${m.isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{m.changeRate}%</span>
                   </div>
                </div>
             </div>
           ))}
        </section>

        {/* [16차 & 18차] 실전 확장 탭 바 */}
        <section className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden flex flex-col">
           <div className="px-8 pt-8 pb-4 flex justify-between items-end">
              <div className="space-y-1">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Award size={18} className="text-blue-500" /> SMART RANKING 30
                 </h3>
                 <p className="text-[11px] font-bold text-slate-300">Advanced Algorithmic Filtering</p>
              </div>
           </div>

           {/* 가로 스크롤 탭 */}
           <div className="px-6 py-4 flex gap-3 overflow-x-auto whitespace-nowrap hide-scrollbar border-b border-gray-50 bg-slate-50/30">
              {Object.keys(tabMapping).map(tabName => (
                <button 
                  key={tabName} 
                  onClick={() => setActiveTab(tabName)} 
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tabName ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  {tabName}
                </button>
              ))}
           </div>

           <div className="p-4 space-y-3">
              {isRankingLoading ? (
                <div className="py-40 text-center flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-blue-100" size={40} />
                  <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Streaming Intelligence...</p>
                </div>
              ) : rankingStocks.length === 0 ? (
                <div className="py-40 text-center flex flex-col items-center gap-4">
                  <Info className="text-slate-100" size={48} />
                  <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">No rankings found for this category</p>
                </div>
              ) : rankingStocks.slice(0, 30).map((rs, idx) => {
                const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                return (
                  <div key={`${rs.itemCode}-${idx}`} onClick={() => handleStockClick(rs)} className="p-7 bg-white rounded-[2.25rem] border border-gray-50 shadow-sm flex justify-between items-center group active:scale-[0.98] transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-slate-100">
                     <div className="flex items-center gap-5">
                        <span className="text-[16px] font-black text-slate-200 group-hover:text-blue-300 transition-colors w-7">{idx + 1}</span>
                        <div>
                           <h4 className="text-[19px] font-black text-slate-900 tracking-tighter leading-tight">{rs.stockName}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{rs.itemCode}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                              {/* [16차 & 18차] 거래량 렌더링 복구 */}
                              <span className="text-[11px] font-black text-slate-400">거래량: {rs.volume} 주</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-[21px] font-black text-slate-900 tracking-tighter leading-none tabular-nums">{rs.closePrice}</p>
                        <span className={`text-[11px] font-black px-3.5 py-1 rounded-xl flex items-center gap-1 ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                           {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                        </span>
                     </div>
                  </div>
                );
              })}
           </div>
        </section>
      </div>

      {/* [16차] 고도화된 바텀 시트 (고급 투자 지표 패널 포함) */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-6 pb-12">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom-32 duration-700 overflow-hidden">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-100 rounded-full"></div>
              
              <div className="flex items-center justify-between mb-8 mt-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedStock.stockName}</h3>
                    <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1.5">{selectedStock.itemCode} 리서치 결과</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400"><X size={20} /></button>
              </div>

              {/* 고급 투자 지표 패널 */}
              <div className="grid grid-cols-2 gap-3 mb-10">
                 <div className="bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100 group">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                       <Zap size={10} className="text-blue-500" /> 52주 최거 / 최저
                    </p>
                    <p className="text-[13px] font-black text-slate-900 tracking-tight">
                       {selectedStock.high52w} / {selectedStock.low52w}
                    </p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                       <TrendingUp size={10} className="text-red-500" /> 52주 신고가 근접
                    </p>
                    <p className="text-lg font-black text-red-500 tracking-tighter">
                       {getHighProximity(selectedStock.closePrice, selectedStock.high52w)}
                    </p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                       <Target size={10} className="text-green-500" /> 증권사 목표가
                    </p>
                    <p className="text-[13px] font-black text-slate-900 tracking-tight">
                       {selectedStock.targetPrice === '-' ? '정보 없음' : selectedStock.targetPrice + '원'}
                    </p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                       <Info size={10} className="text-slate-400" /> 투자의견
                    </p>
                    <p className="text-[13px] font-black text-blue-600 tracking-tight">
                       {selectedStock.opinion}
                    </p>
                 </div>
              </div>

              {/* 액션 버튼 */}
              <div className="grid grid-cols-1 gap-4">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[2rem] group hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <LineChartIcon size={24} />
                       </div>
                       <div className="text-left">
                          <p className="text-base font-black uppercase tracking-widest leading-none">📊 차트 시각화 분석</p>
                          <p className="text-[10px] text-white/50 font-bold mt-1.5">기술적 흐름 및 패턴 타점 확인</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-white/30 group-hover:text-white" />
                 </button>

                 <div className="grid grid-cols-2 gap-4 mt-2">
                    <button 
                      onClick={() => openAi('analysis')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.25rem] border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Bot size={32} className="text-slate-900 group-hover:text-blue-600 transition-transform group-hover:scale-110" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500">AI 정밀 분석</span>
                    </button>
                    <button 
                      onClick={() => openAi('strategy')}
                      className="flex flex-col items-center gap-4 p-8 bg-slate-50 rounded-[2.25rem] border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all group active:scale-95"
                    >
                       <Sparkles size={32} className="text-slate-900 group-hover:text-blue-600 transition-transform group-hover:scale-110" />
                       <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500">투자 전략가</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 데이터 모달 (차트/AI) */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-2xl" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[440px] rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-400 border border-white/20">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                       {activeModal === 'chart' ? 'Asset Stream' : aiMode === 'analysis' ? 'Neural Analysis' : 'Wealth Strategy'}
                    </h2>
                    <p className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-[0.2em] opacity-80">{selectedStock.stockName} · {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
              </div>

              <div className="min-h-[320px] flex flex-col justify-center">
                 {activeModal === 'chart' ? (
                   <div className="h-[320px] w-full mt-4">
                      {isChartLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-5">
                           <Loader2 className="animate-spin text-blue-100" size={56} />
                           <p className="text-[10px] font-black text-slate-200 tracking-[0.4em] uppercase">Mining Financial Patterns...</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                 <linearGradient id="popChartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="#f1f5f9" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip cursor={{ stroke: '#2563eb', strokeWidth: 1 }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)', padding: '20px' }} />
                              <Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={5} fillOpacity={1} fill="url(#popChartGrad)" animationDuration={1200} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 mt-10">
                         <div className="bg-slate-50 p-5 rounded-[1.5rem] flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">52w High</span>
                            <span className="text-xs font-black text-slate-900">{selectedStock.high52w}</span>
                         </div>
                         <div className="bg-slate-50 p-5 rounded-[1.5rem] flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Curr Price</span>
                            <span className="text-xs font-black text-blue-600">{selectedStock.closePrice}</span>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="min-h-[260px]">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6">
                           <div className="relative">
                              <Loader2 className="animate-spin text-blue-600" size={48} />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <Bot size={20} className="text-blue-600" />
                              </div>
                           </div>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Neural Insight Processing...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-800">
                           <div className="bg-blue-50/50 rounded-[2.5rem] p-10 border border-blue-100/50 shadow-inner">
                              <p className="text-lg font-bold leading-[1.8] text-gray-800 whitespace-pre-wrap tracking-tight">
                                 {aiAnalysis}
                              </p>
                           </div>
                           <p className="text-[10px] font-bold text-slate-300 mt-8 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                              <ShieldAlert size={14} className="text-blue-500" /> Verified by Gemini 2.5 Flash Tech.
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button onClick={() => setActiveModal(null)} className="w-full bg-slate-900 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-slate-200 mt-10 uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all">
                   Confirmed Insight
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
