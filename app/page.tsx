"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, BarChart3, Bot, Sparkles, Loader2, Info, ChevronRight, X, 
  TrendingUp, TrendingDown, Activity, Zap, Star, LayoutGrid, List as ListIcon, 
  LineChart as LineChartIcon, ShieldAlert, Search
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export const dynamic = 'force-dynamic';

interface GlobalIndex {
  name: string;
  value: string;
  change: string;
  changeRate: string;
  status: 'UP' | 'DOWN' | 'SAME';
}

interface StockItem {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  volume: string;
  marketValue?: string;
  tradeValue?: string;
  netBuyValue?: string;
  fluctuationType?: string;
}

export default function Home() {
  const tabs = ['KOSPI 시총상위', 'KOSDAQ 시총상위', '거래량상위', '외국인매매', '기관매매', '시가총액'];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [indices, setIndices] = useState<GlobalIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // 인터랙션 상태
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day');

  const fetchIndices = async () => {
    try {
      const res = await fetch('/api/market?category=INDEX');
      const data = await res.json();
      if (data.success) {
        setIndices(data.data);
      }
    } catch (e) {
      console.error('Index Fetch Error:', e);
    }
  };

  const fetchData = async (category: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/market?category=${encodeURIComponent(category)}`);
      const data = await res.json();
      if (data.success) {
        setStocks(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    fetchData(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchIndices();
    fetchData(activeTab);
  };

  const handleStockClick = (stock: StockItem) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  const fetchChartData = async (ticker: string, period: string) => {
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/chart?ticker=${ticker}&period=${period}`);
      const data = await res.json();
      if (data.success) {
        setChartData(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error('Chart Load Error:', e);
      setChartData([
        { date: '01', close: 50000 },
        { date: '02', close: 51200 },
        { date: '03', close: 50800 },
        { date: '04', close: 52000 },
      ]);
    } finally {
      setIsChartLoading(false);
    }
  };

  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setChartPeriod('day');
    fetchChartData(selectedStock.itemCode, 'day');
  };

  useEffect(() => {
    if (activeModal === 'chart' && selectedStock) {
      fetchChartData(selectedStock.itemCode, chartPeriod);
    }
  }, [chartPeriod]);

  const openAi = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('ai');
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.itemCode,
          name: selectedStock.stockName,
          price: selectedStock.closePrice,
          changePercent: selectedStock.fluctuationsRatio
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 2. 상단 고정 영역: 헤더 + 지수 + 탭 */}
      <div className="flex-shrink-0 z-10 bg-white border-b border-gray-100 max-w-[430px] mx-auto w-full shadow-sm">
        <header className="px-6 py-4 flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">AI STOCK</h1>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Real-time Market Analytics</p>
          </div>
          <button 
            onClick={handleRefresh}
            className={`p-2 bg-white/10 text-white rounded-none active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={18} />
          </button>
        </header>

        {/* 시장 지수 대시보드 */}
        <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100">
           {indices.length > 0 ? indices.map((idx) => (
             <div key={idx.name} className="bg-white p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx.name}</span>
                   <span className={`text-[10px] font-black ${idx.status === 'UP' ? 'text-red-500' : 'text-blue-500'}`}>
                      {idx.status === 'UP' ? '▲' : '▼'} {idx.changeRate}%
                   </span>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900 tabular-nums tracking-tighter">{idx.value}</span>
                   <span className={`text-[10px] font-bold ${idx.status === 'UP' ? 'text-red-400' : 'text-blue-400'}`}>
                      {idx.change}
                   </span>
                </div>
             </div>
           )) : (
             <div className="col-span-2 bg-white p-4 text-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">시장 지수 로딩 중...</span>
             </div>
           )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="overflow-x-auto whitespace-nowrap hide-scrollbar py-1 px-1 bg-white">
          <div className="flex gap-1 px-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 하단 리스트 영역: 독립 스크롤 */}
      <main className="flex-1 overflow-y-auto pt-4 pb-32 px-6 max-w-[430px] mx-auto w-full scroll-smooth">
        <div className="flex justify-between items-center mb-6 mt-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{activeTab} 실시간 순위</span>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-none border border-slate-200 shadow-inner">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 transition-all rounded-none ${viewMode === 'list' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
            >
              <ListIcon size={14} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-all rounded-none ${viewMode === 'grid' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <Loader2 className="animate-spin text-slate-200" size={40} />
            <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.5em]">DATA SYNCING...</p>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'space-y-4 pb-10' : 'grid grid-cols-2 gap-4 pb-10'}>
            {stocks.map((stock, idx) => {
              const changeVal = parseFloat(stock.fluctuationsRatio);
              const isPlus = changeVal > 0;
              const isInvestorTab = activeTab === '외국인매매' || activeTab === '기관매매';
              
              return (
                <div 
                  key={`${stock.itemCode}-${idx}`}
                  onClick={() => handleStockClick(stock)}
                  className={`bg-white rounded-none border border-gray-100 active:bg-slate-50 transition-all hover:border-blue-200 group relative overflow-hidden ${
                    viewMode === 'list' ? 'p-6 flex items-center justify-between' : 'p-6 flex flex-col gap-4'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-slate-50 flex items-center justify-center border border-slate-100 rounded-none group-hover:bg-blue-50 transition-colors">
                      <span className="text-[11px] font-black text-slate-400 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[16px] font-black text-slate-900 tracking-tighter uppercase truncate">
                        {stock.stockName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase">{stock.itemCode}</span>
                         {isInvestorTab && (
                          <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-none border border-blue-100 uppercase">TOP TREND</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={viewMode === 'list' ? 'text-right flex-shrink-0' : 'mt-auto pt-4 border-t border-slate-50'}>
                    <p className="text-[18px] font-black text-slate-900 tabular-nums leading-none tracking-tight">
                      {stock.closePrice}원
                    </p>
                    <div className="flex items-center justify-end gap-3 mt-2">
                       <span className="text-[9px] font-bold text-slate-300 uppercase tabular-nums">
                        {isInvestorTab ? `${stock.netBuyValue}` : `거래: ${stock.volume?.toLocaleString() || '-'}`}
                      </span>
                      <span className={`text-[11px] font-black flex items-center gap-0.5 ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                        {isPlus ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPlus ? '+' : ''}{stock.fluctuationsRatio}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 바텀 시트 (Action Menu) */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-0 pb-0">
           <div className="absolute inset-0 bg-slate-950/40" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[430px] rounded-none p-10 shadow-2xl border-t-8 border-slate-900 animate-in slide-in-from-bottom-full duration-500">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedStock.stockName}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-2">CORE ANALYSIS / {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-900 text-white rounded-none active:bg-blue-600 transition-all"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-6 bg-slate-50 text-slate-900 rounded-none hover:bg-slate-100 transition-all border border-slate-200"
                 >
                    <div className="flex items-center gap-5">
                       <LineChartIcon size={24} className="text-blue-600" />
                       <p className="text-[12px] font-black uppercase tracking-widest">실시간 종목 차트</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                 </button>
                 <button 
                   onClick={openAi}
                   className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-none hover:bg-blue-600 transition-all shadow-xl"
                 >
                    <div className="flex items-center gap-5">
                       <Bot size={24} className="text-blue-400" />
                       <p className="text-[12px] font-black uppercase tracking-widest">AI 심층 진단 리포트</p>
                    </div>
                    <ChevronRight size={18} className="text-white/20" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 전용 모달 (Chart/AI) */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-950/80" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[450px] rounded-none p-12 border-t-[12px] border-slate-900 shadow-2xl">
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
                 <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{activeModal === 'chart' ? 'Market Chart' : 'AI Intelligence'}</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedStock.stockName} 데이터 분석</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>

              {activeModal === 'chart' && (
                <div className="flex mb-8 bg-slate-100 p-1 border border-slate-200">
                  {['day', 'week', 'month'].map((p) => (
                    <button 
                      key={p}
                      onClick={() => setChartPeriod(p as any)}
                      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${chartPeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                    >
                      {p === 'day' ? '일간' : p === 'week' ? '주간' : '월간'}
                    </button>
                  ))}
                </div>
              )}

              <div className="min-h-[300px]">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full bg-slate-50/50 border border-slate-100 p-4 relative">
                      {isChartLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm z-10">
                          <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={chartData}>
                            <defs>
                               <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '0', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: '900' }} />
                            <Area type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={4} fill="url(#colorPrice)" animationDuration={1000} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-10 border-l-8 border-blue-600 shadow-inner">
                      {isAiLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-6 animate-pulse">
                           <Sparkles size={50} className="text-blue-600" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">THINKING...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                           <p className="text-[15px] font-bold text-slate-800 leading-relaxed tracking-tight whitespace-pre-wrap">{aiAnalysis}</p>
                           <div className="mt-12 pt-8 border-t border-slate-200">
                              <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                <ShieldAlert size={14} className="text-blue-500" /> 감정을 배제한 기계적 데이터 분석 결과입니다
                              </p>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full bg-slate-900 text-white font-black py-7 rounded-none mt-10 uppercase tracking-[0.3em] text-xs hover:bg-blue-600 transition-all shadow-2xl shadow-blue-200 active:scale-[0.98]"
              >
                 CLOSE PROJECT
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
