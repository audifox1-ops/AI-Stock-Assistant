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
  marketCap: number;
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
      if (data.success) {
        setRankingList(data.data);
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
    setSelectedTicker(ticker);
    setIsModalOpen(true);
    setIsDetailLoading(true);
    setAiAnalysis(null);
    setDetailData(null);
    setChartData([]);
    setSelectedTimeframe('day'); // 리셋

    try {
      // 1. 상세 지표 데이터 페칭
      const res = await fetch(`/api/market?type=detail&ticker=${ticker}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDetailData(data.data);
        
        // 2. 차트 데이터 페칭 (기본 일봉)
        await fetchChartData(ticker, 'day');

        // 3. AI 분석 요청 (모든 상세 지표 전달)
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
      {/* 1. 상단 고정 헤더 영역 (지수 및 탭 메뉴) */}
      <section className="flex-none bg-white shadow-xl z-50">
        <header className="px-6 py-8 border-b border-gray-100 flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Market.AI</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Real-time Trading Cloud</p>
           </div>
           <div className="flex gap-4">
              <button className="p-3 bg-slate-900 text-white rounded-none shadow-lg"><Plus size={18} /></button>
           </div>
        </header>

        {/* 지수 대시보드 */}
        <div className="px-6 py-8 grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100 font-sans">
          {isLoadingIndices ? (
            <div className="col-span-2 py-10 flex flex-col items-center gap-4 bg-white">
               <Loader2 className="animate-spin text-slate-200" size={24} />
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">CONNECTING TO MARKET DATA...</p>
            </div>
          ) : (
            indices.map((idx, i) => {
              const isUp = idx.status === 'UP';
              return (
                <div key={i} className="bg-white p-6 flex flex-col items-start font-sans">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx.name}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tabular-nums tracking-tighter mb-2">{idx.value}</h2>
                  <div className={`flex items-center gap-3 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                    <span className="text-[10px] font-black tabular-nums">{isUp ? '▲' : '▼'} {idx.change}</span>
                    <span className="text-[10px] font-black tabular-nums bg-slate-50 px-2 py-1 rounded-none border border-current">{idx.changeRate}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white px-2 py-4 flex gap-2 overflow-x-auto hide-scrollbar">
           {TABS.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.value)}
               className={`flex-none px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none border ${
                 activeTab === tab.value 
                   ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                   : 'text-slate-400 border-transparent hover:border-slate-100'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </section>

      {/* 2. 메인 컨텐츠 영역 (스크롤 리스트) */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="px-6 py-6 flex justify-between items-center bg-slate-50 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/50">
           <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Market Ranking</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Updated: {lastUpdated}</p>
           </div>
           <button onClick={() => fetchRanking(activeTab)} className="p-3 bg-white border border-slate-200 active:bg-blue-600 active:text-white group">
              <RefreshCcw size={14} className={isLoadingRanking ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
           </button>
        </div>

        <div className="px-6 mt-4 space-y-4">
          {isLoadingRanking ? (
             <div className="py-20 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-slate-200" size={40} />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">PARSING RANKING DATA...</p>
             </div>
          ) : rankingList.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-5">
                <AlertCircle size={40} className="text-slate-100" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">준비된 데이터가 없습니다.<br/>잠시 후 다시 시도해주세요.</p>
             </div>
          ) : (
            rankingList.map((stock, idx) => {
              const changeVal = parseFloat(stock.fluctuationsRatio);
              const isPlus = changeVal > 0;
              const isMinus = changeVal < 0;

              return (
                <div 
                  key={stock.itemCode} 
                  onClick={() => openDetailModal(stock.itemCode)}
                  className="bg-white border border-slate-100 p-6 flex flex-col gap-5 hover:border-blue-500 group transition-all duration-300 rounded-none shadow-sm hover:shadow-xl cursor-pointer"
                >
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center text-[11px] font-black uppercase">
                            {idx + 1}
                         </div>
                         <div>
                            <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase group-hover:text-blue-600 transition-colors leading-none mb-1">
                               {stock.stockName}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-300 tracking-[0.2em]">{stock.itemCode}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-slate-900 tracking-tighter tabular-nums leading-none mb-2">
                            {stock.closePrice.toLocaleString()}
                         </p>
                         <div className={`text-[10px] font-black tabular-nums border px-2 py-1 inline-block ${isPlus ? 'text-red-500 border-red-50' : isMinus ? 'text-blue-500 border-blue-50' : 'text-slate-400 border-slate-50'}`}>
                            {isPlus ? '+' : ''}{stock.fluctuationsRatio}%
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-5">
                      <div className="flex flex-col gap-1">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Trading Vol</span>
                         <span className="text-xs font-bold text-slate-900 tabular-nums tracking-tighter">
                            {stock.volume.toLocaleString()} 주
                         </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Market View</span>
                         <div className="flex justify-end items-center gap-2">
                            {isPlus ? <TrendingUp size={12} className="text-red-500" /> : <TrendingDown size={12} className="text-blue-500" />}
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">See Detail</span>
                         </div>
                      </div>
                   </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 3. 종목 상세 모달 (캔들 차트 도입 버전) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-none border-t-[16px] border-slate-900 shadow-2xl hide-scrollbar">
            
            {isDetailLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-8">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">ANALYZING MARKET DATA...</p>
              </div>
            ) : detailData && (
              <div className="p-10">
                {/* 모달 헤더 */}
                <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-slate-100">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 uppercase">{detailData.industryName}</span>
                       <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{detailData.ticker}</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{detailData.stockName}</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-900 text-white rounded-none shadow-xl hover:bg-red-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* 현재가 및 수치 카드 */}
                <div className="grid grid-cols-3 gap-px bg-slate-100 border border-slate-100 mb-8">
                   <div className="col-span-2 bg-slate-900 p-8">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Real-time Price</p>
                      <div className="flex items-end gap-3">
                         <h3 className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">{detailData.price.toLocaleString()}</h3>
                         <span className="text-lg font-bold text-white/40 pb-0.5 uppercase">KRW</span>
                      </div>
                   </div>
                   <div className="bg-white p-6 flex flex-col justify-center text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Price</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums leading-none mb-2">{detailData.targetPrice.toLocaleString()}</p>
                      {detailData.targetPrice > 0 && detailData.price > 0 && (
                        <span className="text-[10px] font-black text-blue-600 uppercase">
                          +{(((detailData.targetPrice - detailData.price) / detailData.price) * 100).toFixed(1)}% Gap
                        </span>
                      )}
                   </div>
                </div>

                {/* 차트 영역 및 주기 선택 */}
                <div className="mb-10 bg-white border border-slate-100 p-6 overflow-hidden">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                         <CandlestickChart size={18} className="text-slate-900" />
                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Professional Chart</span>
                      </div>
                      {/* 주기 선택 버튼 그룹 */}
                      <div className="flex gap-1 bg-slate-50 p-1">
                         {TIMEFRAMES.map(tf => (
                           <button
                             key={tf.value}
                             onClick={() => handleTimeframeChange(tf.value)}
                             className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all ${
                               selectedTimeframe === tf.value 
                                 ? 'bg-slate-900 text-white shadow-md' 
                                 : 'text-slate-400 hover:text-slate-900'
                             }`}
                           >
                             {tf.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="relative min-h-[400px] border border-slate-100">
                      {isChartLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-4">
                           <Loader2 className="animate-spin text-blue-600" size={32} />
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Syncing Chart Data...</p>
                        </div>
                      ) : chartData.length > 0 ? (
                        <StockChart data={chartData} isMinute={['1m', '3m', '5m'].includes(selectedTimeframe)} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-20">
                           <BarChart3 size={48} />
                           <p className="text-[10px] font-black mt-4 uppercase tracking-[0.5em]">No Chart Data available</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* 핵심 지표 그리드 */}
                <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 mb-10">
                   <div className="bg-white p-5 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">52주 최고/최저</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-black text-red-500">{detailData.high52w.toLocaleString()}</span>
                         <span className="text-slate-200">/</span>
                         <span className="text-xs font-black text-blue-500">{detailData.low52w.toLocaleString()}</span>
                      </div>
                   </div>
                   <div className="bg-white p-5 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Cap (시총)</span>
                      <span className="text-xs font-black text-slate-900 tracking-tighter">
                         {detailData.marketCap > 100000000 
                            ? (detailData.marketCap / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + '억원'
                            : detailData.marketCap.toLocaleString() + '원'}
                      </span>
                   </div>
                   <div className="bg-white p-5 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valuation (PER/PBR)</span>
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-black text-slate-900">PER {detailData.per}x</span>
                         <span className="text-xs font-black text-slate-900">PBR {detailData.pbr}x</span>
                      </div>
                   </div>
                   <div className="bg-white p-5 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yield (배당수익률)</span>
                      <span className="text-xs font-black text-green-600">{detailData.dividendYield}%</span>
                   </div>
                </div>

                {/* AI 분석 리포트 영역 */}
                <div className="border-t-4 border-slate-900 pt-10">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-none shadow-lg">
                         <Bot size={20} className="text-white" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">🤖 AI 인텔리전스 투자 리포트</h4>
                   </div>

                   <div className="bg-slate-50 p-8 border-l-4 border-blue-600 min-h-[150px] font-sans">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-5">
                           <Loader2 className="animate-spin text-blue-600" size={24} />
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">심층 밸류에이션 분석 중...</p>
                        </div>
                      ) : (
                        <div className="text-[14px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap text-justify">
                           {aiAnalysis || "분석 데이터를 가져오지 못했습니다."}
                        </div>
                      )}
                   </div>
                </div>
                
                <button 
                   onClick={() => setIsModalOpen(false)}
                   className="w-full bg-slate-900 text-white font-black py-7 rounded-none mt-12 uppercase tracking-[0.5em] text-xs shadow-2xl active:scale-[0.98] transition-all"
                >
                   Terminating Analysis Node
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
