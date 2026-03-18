"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap,
  Menu, Bell, Settings, Filter, Target, Activity, PieChart, ChevronRight,
  CandlestickChart, Bot
} from 'lucide-react';
import StockChart from '@/components/StockChart';

export const dynamic = 'force-dynamic';

interface IndexInfo {
  name: string;
  value: string;
  change: string;
  changeRate: string;
  status: 'UP' | 'DOWN' | 'SAME';
}

interface RankedStock {
  itemCode: string;
  stockName: string;
  closePrice: number;
  fluctuationsRatio: string;
  volume: number;
  fluctuationType: string;
}

interface StockDetail {
  ticker: string;
  stockName: string;
  price: number;
  changeRate: string;
  high52w: number;
  low52w: number;
  targetPrice: number;
  marketCap: number; // 백엔드에서 억 단위로 전달됨
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  dividendYield: string;
  industryName: string;
}

const TABS = [
  { id: 'kospi_market_cap', label: '코스피 시총', value: 'kospi_market_cap' },
  { id: 'kosdaq_market_cap', label: '코스닥 시총', value: 'kosdaq_market_cap' },
  { id: 'volume', label: '거래량 상위', value: 'volume' },
  { id: 'foreign_buy', label: '외인 매수', value: 'foreign_buy' },
  { id: 'institution_buy', label: '기관 매수', value: 'institution_buy' }
];

const TIMEFRAMES = [
  { label: '1분', value: '1m' },
  { label: '3분', value: '3m' },
  { label: '5분', value: '5m' },
  { label: '일', value: 'day' },
  { label: '주', value: 'week' },
  { label: '월', value: 'month' }
];

export default function HomePage() {
  const [indices, setIndices] = useState<IndexInfo[]>([]);
  const [rankingList, setRankingList] = useState<RankedStock[]>([]);
  const [activeTab, setActiveTab] = useState('kospi_market_cap');
  const [isLoadingIndices, setIsLoadingIndices] = useState(true);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 상세 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<StockDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 차트 상태
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');

  const fetchIndices = async () => {
    setIsLoadingIndices(true);
    try {
      const res = await fetch('/api/market?type=index');
      const data = await res.json();
      if (data.success) {
        setIndices(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIndices(false);
    }
  };

  const fetchRanking = async (tabValue: string) => {
    setIsLoadingRanking(true);
    try {
      const res = await fetch(`/api/market?type=${tabValue}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRankingList(data.data);
      } else {
        setRankingList([]);
      }
    } catch (e) {
      console.error(e);
      setRankingList([]);
    } finally {
      setIsLoadingRanking(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  };

  const fetchChartData = async (ticker: string, timeframe: string) => {
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/stock/chart?ticker=${ticker}&timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setChartData(data.data);
      }
    } catch (e) {
      console.error('Chart Fetch Error:', e);
    } finally {
      setIsChartLoading(false);
    }
  };

  const openDetailModal = async (ticker: string) => {
    const cleanTicker = String(ticker).trim();
    setSelectedTicker(cleanTicker);
    setIsModalOpen(true);
    setIsDetailLoading(true);
    setAiAnalysis(null);
    setDetailData(null);
    setChartData([]);
    setSelectedTimeframe('day'); 

    try {
      const res = await fetch(`/api/market?type=detail&ticker=${cleanTicker}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDetailData(data.data);
        
        await fetchChartData(cleanTicker, 'day');

        setIsAiLoading(true);
        const aiRes = await fetch('/api/analyze-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockInfo: data.data })
        });
        const aiData = await aiRes.json();
        setAiAnalysis(aiData.analysis || aiData.error);
      }
    } catch (e) {
      console.error('Detail Fetch Error:', e);
    } finally {
      setIsDetailLoading(false);
      setIsAiLoading(false);
    }
  };

  const handleTimeframeChange = async (tf: string) => {
    if (!selectedTicker) return;
    setSelectedTimeframe(tf);
    await fetchChartData(selectedTicker, tf);
  };

  useEffect(() => {
    fetchIndices();
  }, []);

  useEffect(() => {
    fetchRanking(activeTab);
  }, [activeTab]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 font-sans">
      {/* 상단 헤더 (신뢰감 있는 다크 네이비 테마) */}
      <section className="flex-none bg-slate-900 z-50 shadow-2xl">
        <header className="px-6 py-8 border-b border-white/5 flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Market.AI</h1>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Real-time Financial Intelligence</p>
           </div>
           <div className="flex gap-4">
              <button className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"><Plus size={18} /></button>
              <button className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"><Settings size={18} /></button>
           </div>
        </header>

        {/* 지수 대시보드 (헤더와 일관된 다크 테마) */}
        <div className="px-6 py-6 grid grid-cols-2 gap-px bg-white/5">
          {isLoadingIndices ? (
            <div className="col-span-2 py-8 flex flex-col items-center gap-3 bg-transparent">
               <Loader2 className="animate-spin text-blue-500" size={20} />
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">SYNCING NODES...</p>
            </div>
          ) : (
            indices.map((idx, i) => {
              const isUp = idx.status === 'UP';
              return (
                <div key={i} className="bg-transparent p-4 flex flex-col items-start font-sans border-r border-white/5 last:border-r-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{idx.name}</span>
                  </div>
                  {/* [fintech-expert] 지수 수치 표시: pt 단위 추가 */}
                  <h2 className="text-xl font-bold text-white tabular-nums tracking-tight mb-1">
                    {idx.value} <span className="text-xs text-white/40 font-medium ml-1">pt</span>
                  </h2>
                  <div className={`flex items-center gap-2 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                    <span className="text-[11px] font-bold tabular-nums">{isUp ? '▲' : '▼'} {idx.change}</span>
                    <span className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded ${isUp ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>{idx.changeRate}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 탭 네비게이션 (Pill 디자인) */}
        <div className="bg-white px-6 py-4 flex gap-3 overflow-x-auto hide-scrollbar border-b border-slate-100">
           {TABS.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.value)}
               className={`flex-none px-5 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                 activeTab === tab.value 
                   ? 'bg-slate-900 text-white rounded-full shadow-lg ring-4 ring-slate-900/10' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </section>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="px-6 py-6 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-slate-50/80 border-b border-slate-100">
           <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em]">Market Performance</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Cloud Update: {lastUpdated}</p>
           </div>
           <button onClick={() => fetchRanking(activeTab)} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm active:scale-95 transition-all text-slate-600 hover:bg-slate-50 group">
              <RefreshCcw size={14} className={isLoadingRanking ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
           </button>
        </div>

        <div className="px-6 mt-6 pb-12">
          {isLoadingRanking ? (
             <div className="py-20 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-slate-300" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">CONNECTING DATA STREAM...</p>
             </div>
          ) : rankingList.length === 0 ? (
             <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-5">
                <AlertCircle size={40} className="text-slate-200" />
                <p className="text-xs font-bold text-slate-400 leading-relaxed">정보를 불러올 수 없습니다.<br/>나중에 다시 시도해 주세요.</p>
             </div>
          ) : (
            rankingList.map((stock, idx) => {
              const changeVal = parseFloat(stock.fluctuationsRatio);
              const isPlus = changeVal > 0;
              const isMinus = changeVal < 0;

              return (
                <div 
                  key={`${stock.itemCode}-${idx}`} 
                  onClick={() => openDetailModal(stock.itemCode)}
                  className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-slate-100 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[12px] font-bold group-hover:bg-slate-900 group-hover:text-white transition-all">
                            {idx + 1}
                         </div>
                         <div>
                            <h4 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1.5">
                               {stock.stockName}
                            </h4>
                            <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{stock.itemCode}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-bold text-slate-900 tracking-tight tabular-nums leading-none mb-2">
                            {stock.closePrice.toLocaleString()}
                         </p>
                         <div className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md inline-block ${isPlus ? 'text-red-500 bg-red-50' : isMinus ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                            {isPlus ? '+' : ''}{stock.fluctuationsRatio}%
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 mt-1">
                      <div className="flex flex-col gap-1">
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Trading Vol</span>
                         <span className="text-xs font-bold text-slate-500 tabular-nums">
                            {stock.volume.toLocaleString()}
                         </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Market Status</span>
                         <div className="flex justify-end items-center gap-1.5">
                            {isPlus ? <TrendingUp size={12} className="text-red-400" /> : isMinus ? <TrendingDown size={12} className="text-blue-400" /> : <Activity size={12} className="text-slate-300" />}
                            <span className={`text-[10px] font-bold uppercase ${isPlus ? 'text-red-400' : isMinus ? 'text-blue-400' : 'text-slate-300'}`}>
                               {isPlus ? 'Bullish' : isMinus ? 'Bearish' : 'Neutral'}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 종목 상세 모달 (기존 로직 유지, 스타일 포인트 정제) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-3xl flex flex-col hide-scrollbar border border-white/20">
            
            {isDetailLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">DECRYPTING FINANCIAL DATA...</p>
              </div>
            ) : detailData && (
              <div className="p-8">
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                       <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase">{detailData.industryName || 'Market'}</span>
                       <span className="text-[11px] font-bold text-slate-300 tracking-widest uppercase">{detailData.ticker}</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{detailData.stockName}</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 mb-8">
                   <div className="col-span-2 bg-slate-900 p-8">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">Target Node Price</p>
                      <div className="flex items-end gap-2">
                         <h3 className="text-4xl font-black text-white tabular-nums tracking-tight leading-none">{detailData.price.toLocaleString()}</h3>
                         <span className="text-sm font-bold text-white/30 pb-1 uppercase">KRW</span>
                      </div>
                   </div>
                   <div className="bg-white p-6 flex flex-col justify-center text-right">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Value Gap</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">{(detailData.targetPrice || 0).toLocaleString()}</p>
                      {detailData.targetPrice > 0 && (
                        <span className="text-[11px] font-black text-blue-500 uppercase mt-2">
                           {(((detailData.targetPrice - detailData.price) / detailData.price) * 100).toFixed(1)}% Up
                        </span>
                      )}
                   </div>
                </div>

                <div className="mb-10 bg-white border border-slate-100 rounded-2xl p-2 overflow-hidden shadow-sm">
                   <div className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-2">
                         <CandlestickChart size={18} className="text-slate-900" />
                         <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Market Flow Chart</span>
                      </div>
                      <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                         {TIMEFRAMES.map(tf => (
                           <button
                             key={tf.value}
                             onClick={() => handleTimeframeChange(tf.value)}
                             className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-tighter transition-all rounded-md ${
                               selectedTimeframe === tf.value 
                                 ? 'bg-white text-slate-900 shadow-sm' 
                                 : 'text-slate-400 hover:text-slate-600'
                             }`}
                           >
                             {tf.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="relative min-h-[400px]">
                      {isChartLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-3">
                           <Loader2 className="animate-spin text-blue-600" size={24} />
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Refinement...</p>
                        </div>
                      ) : chartData.length > 0 ? (
                        <StockChart data={chartData} isMinute={['1m', '3m', '5m'].includes(selectedTimeframe)} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-10">
                           <BarChart3 size={48} />
                           <p className="text-[10px] font-bold mt-4 uppercase tracking-[0.4em]">Node Idle</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                   <div className="bg-slate-50 p-5 rounded-2xl flex flex-col gap-1.5 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yearly Extremes</span>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-red-500">{(detailData.high52w || 0).toLocaleString()}</span>
                         <span className="text-slate-200">/</span>
                         <span className="text-sm font-bold text-blue-500">{(detailData.low52w || 0).toLocaleString()}</span>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-5 rounded-2xl flex flex-col gap-1.5 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market Cap</span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                         {(detailData.marketCap || 0).toLocaleString()} <span className="text-[10px]">BN</span>
                      </span>
                   </div>
                   <div className="bg-slate-50 p-5 rounded-2xl flex flex-col gap-1.5 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valuation (PER/PBR)</span>
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-slate-900 border-r border-slate-200 pr-3">{detailData.per || 0}x</span>
                         <span className="text-xs font-bold text-slate-900">{detailData.pbr || 0}x</span>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-5 rounded-2xl flex flex-col gap-1.5 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Div Yield</span>
                      <span className="text-sm font-bold text-green-600">{detailData.dividendYield || '0.00'}%</span>
                   </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                         <Bot size={20} className="text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 tracking-tight uppercase leading-none">AI Insight Report</h4>
                   </div>

                   <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50 min-h-[120px]">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-3">
                           <Loader2 className="animate-spin text-indigo-400" size={20} />
                           <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">AI Thinking...</p>
                        </div>
                      ) : (
                        <div className="text-[14px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap text-justify whitespace-pre-wrap">
                           {aiAnalysis || "AI 리포트를 생성하는 중 오류가 발생했습니다."}
                        </div>
                      )}
                   </div>
                </div>
                
                <button 
                   onClick={() => setIsModalOpen(false)}
                   className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 mt-10 rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all"
                >
                   Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
