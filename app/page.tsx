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
  // [22차] 실전 매매 최적화 탭 구성
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
    fetchData(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(activeTab);
  };

  const handleStockClick = (stock: StockItem) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  // 차트 데이터 페칭 함수 분리
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
      // fallback mock data
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

  // 모달 오픈 시 차트 데이터 초기 페칭
  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setChartPeriod('day'); // 기본값 일봉
    fetchChartData(selectedStock.itemCode, 'day');
  };

  // 기간 변경 시 데이터 리로드
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
    <div className="w-full bg-slate-50 min-h-screen pb-32 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 초슬림 헤더 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50 rounded-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">AI STOCK</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">실시간 스마트 랭킹 30</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRefresh}
            className={`p-3 bg-slate-900 text-white rounded-none active:scale-95 transition-all shadow-none flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 - [23차] 가독성 개선 가이드라인 적용 */}
      <div className="bg-white border-b border-gray-100 sticky top-[97px] z-40 overflow-x-auto whitespace-nowrap hide-scrollbar py-2 px-1 rounded-none">
        <div className="flex gap-4 px-6 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-5 px-5 text-sm md:text-base uppercase tracking-widest transition-all relative ${
                activeTab === tab ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 animate-in fade-in slide-in-from-bottom-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 mt-6">
        {/* 리스트 컨트롤 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{activeTab} 실시간 현황</span>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-none border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 transition-all rounded-none ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-none' : 'text-slate-400'}`}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-all rounded-none ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-none' : 'text-slate-400'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* 메인 리스트 - [22차] 수급 지표 대응 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">데이터를 수급하고 있습니다...</p>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
            {stocks.map((stock, idx) => {
              const isPlus = parseFloat(stock.fluctuationsRatio) > 0;
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
                    <div>
                      <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase truncate max-w-[120px]">
                        {stock.stockName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">{stock.itemCode}</span>
                        {isInvestorTab && (
                          <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-none border border-blue-100 uppercase">수급집계</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={viewMode === 'list' ? 'text-right' : 'mt-auto pt-4 border-t border-slate-50'}>
                    <p className="text-[18px] font-black text-slate-900 tabular-nums leading-none tracking-tight">
                      {stock.closePrice}원
                    </p>
                    <div className="flex items-center justify-end gap-3 mt-2">
                       {/* [22차] 수급 데이터일 경우 순매수액 우선 표시 */}
                       <span className="text-[10px] font-bold text-slate-300 uppercase tabular-nums">
                        {isInvestorTab ? `순매수 ${stock.netBuyValue}` : `거래 ${stock.volume?.toLocaleString()}주`}
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
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-0 pb-0 shadow-2xl">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-none" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[430px] rounded-none p-10 shadow-none border-t-4 border-blue-600 animate-in slide-in-from-bottom-full duration-500">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedStock.stockName}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-2">종목 상세 분석 / {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-none text-slate-400 border border-slate-100"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 gap-px bg-slate-100 border border-slate-100">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-7 bg-slate-900 text-white rounded-none active:bg-blue-600 transition-all"
                 >
                    <div className="flex items-center gap-5">
                       <LineChartIcon size={24} className="text-blue-400" />
                       <p className="text-[13px] font-black uppercase tracking-widest font-sans">📊 차트 보기</p>
                    </div>
                    <ChevronRight size={18} className="text-white/20" />
                 </button>
                 <button 
                   onClick={openAi}
                   className="w-full flex items-center justify-between p-7 bg-white text-slate-900 rounded-none hover:bg-slate-50 transition-all border-t border-slate-100"
                 >
                    <div className="flex items-center gap-5">
                       <Bot size={24} className="text-blue-600" />
                       <p className="text-[13px] font-black uppercase tracking-widest font-sans">AI 종목 진단</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-200" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 전용 모달 (Chart/AI) - [23차] 일/주/월봉 연동형 멀티 차트 */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[400px] rounded-none p-12 shadow-none border-4 border-slate-900">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                    {activeModal === 'chart' ? '실시간 차트' : 'AI 분석 리포트'}
                 </h2>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>

              {activeModal === 'chart' && (
                <div className="flex mb-6 bg-slate-100 p-1 border border-slate-200">
                  <button 
                    onClick={() => setChartPeriod('day')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${chartPeriod === 'day' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    일봉
                  </button>
                  <button 
                    onClick={() => setChartPeriod('week')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${chartPeriod === 'week' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    주봉
                  </button>
                  <button 
                    onClick={() => setChartPeriod('month')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${chartPeriod === 'month' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    월봉
                  </button>
                </div>
              )}

              <div className="min-h-[300px]">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full bg-slate-50/50 border border-slate-100 p-2">
                      {isChartLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-5">
                          <Loader2 className="animate-spin text-blue-600" size={32} />
                          <p className="uppercase text-[10px] font-black text-slate-300 tracking-widest">분석 데이터 구성 중...</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                 <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis 
                                dataKey="date" 
                                hide 
                              />
                              <YAxis 
                                domain={['auto', 'auto']} 
                                hide 
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '0', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                                labelFormatter={(label) => `날짜: ${label}`}
                              />
                              <Area type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={3} fill="url(#colorPrice)" animationDuration={500} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-8 border-l-4 border-blue-600">
                      {isAiLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-6">
                           <Sparkles size={40} className="text-blue-600 animate-pulse" />
                           <p className="text-[10px] font-black text-slate-300 tracking-[0.4em] uppercase">분석 시스템 가동 중...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <p className="text-[14px] font-bold text-slate-800 uppercase leading-relaxed tracking-tight whitespace-pre-wrap">{aiAnalysis}</p>
                           <p className="text-[9px] font-bold text-slate-300 mt-10 text-center uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                             <ShieldAlert size={14} className="text-blue-500" /> 실전 매매 전 반드시 전문가와 상담하세요
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              <button 
                onClick={() => setActiveModal(null)} 
                className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-10 uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-none font-sans"
              >
                 확인 및 종료
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
