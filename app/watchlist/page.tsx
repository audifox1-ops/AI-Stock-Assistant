"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, ChevronRight, Loader2,
  X, Info, RefreshCcw, BarChart3, LineChart as LineChartIcon, Bot, Sparkles, ShieldAlert,
  Zap, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export const dynamic = 'force-dynamic';

const WATCHLIST_STORAGE_KEY = 'myWatchlist';

interface Stock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  volume: string;
  high52w: string;
  low52w: string;
  targetPrice: string;
  upsidePotential: string;
  opinion: string;
}

interface DetectedSupply {
  ticker: string;
  name: string;
  type: '외국인' | '기관';
  rank: number;
  netBuyValue: string;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // 실시간 시세 동기화 상태 추가
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [detectedSupplies, setDetectedSupplies] = useState<DetectedSupply[]>([]);
  const [isRadarLoading, setIsRadarLoading] = useState(false);

  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // 수급 레이더 감지 로직
  const checkSupplyRadar = async (stocks: Stock[]) => {
    if (stocks.length === 0) return;
    setIsRadarLoading(true);
    try {
      const tickers = stocks.map(s => s.itemCode);
      const res = await fetch('/api/supply-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      const data = await res.json();
      if (data.success) {
        setDetectedSupplies(data.data);
      }
    } catch (e) {
      console.error('Radar check failed:', e);
    } finally {
      setIsRadarLoading(false);
    }
  };

  // 실시간 시세 로드 및 동기화 로직 보강
  const fetchRealtimePrices = async (stocks: Stock[]) => {
    if (stocks.length === 0) return;
    setIsSyncing(true);
    const codes = stocks.map(s => s.itemCode).join(',');
    try {
      const res = await fetch(`/api/prices?codes=${codes}`);
      const data = await res.json();
      if (data.success) {
        const updatedWatchlist = stocks.map(s => {
          const live = data.data[s.itemCode];
          if (live) {
            return {
              ...s,
              closePrice: live.closePrice, 
              fluctuationsRatio: live.fluctuationsRatio,
              volume: live.volume
            };
          }
          return s;
        });
        setWatchlist(updatedWatchlist);
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist));
      }
    } catch (e) {
      console.error('Failed to fetch realtime prices:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadWatchlist = async () => {
    setIsRefreshing(true);
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsedStocks = JSON.parse(saved);
        setWatchlist(parsedStocks);
        await Promise.all([
          fetchRealtimePrices(parsedStocks),
          checkSupplyRadar(parsedStocks)
        ]);
      } else {
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleRemove = (itemCode: string) => {
    const updated = watchlist.filter(s => s.itemCode !== itemCode);
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    setDetectedSupplies(prev => prev.filter(d => d.ticker !== itemCode));
  };

  const handleAddSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    const isCode = /^\d{6}$/.test(searchQuery);
    const newStock: Stock = {
      itemCode: isCode ? searchQuery : '000000',
      stockName: isCode ? '검색된 종목' : searchQuery,
      closePrice: '0',
      fluctuationsRatio: '0.00',
      volume: '0',
      high52w: '-',
      low52w: '-',
      targetPrice: '-',
      upsidePotential: '-',
      opinion: '-'
    };

    const updated = [newStock, ...watchlist];
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    setSearchQuery('');
    setIsAddModalOpen(false);
    
    await fetchRealtimePrices(updated);
    checkSupplyRadar(updated);
  };

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  const handleRadarClick = (detected: DetectedSupply) => {
    const stock = watchlist.find(s => s.itemCode === detected.ticker);
    if (stock) {
      setSelectedStock(stock);
      setActiveModal('ai');
      triggerAiAnalysis(stock, `🚨 ${detected.type} 수급 포착(순매수 ${detected.rank}위)! 현재 대량 매수세가 유입된 배경과 대응 전략을 3줄로 리포트해.`);
    }
  };

  const triggerAiAnalysis = async (stock: Stock, instruction: string) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.itemCode,
          name: stock.stockName,
          price: stock.closePrice,
          changePercent: stock.fluctuationsRatio,
          instruction: instruction
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally { setIsAiLoading(false); }
  };

  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/chart?ticker=${selectedStock.itemCode}&period=day`);
      const data = await res.json();
      if (data.success) {
        setChartData(data.data.map((d: any) => ({
          date: d.date,
          price: d.close
        })));
      }
    } catch (e) {
      console.error('Chart Load Error:', e);
    } finally { setIsChartLoading(false); }
  };

  const openAiDefault = () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('ai');
    triggerAiAnalysis(selectedStock, "현재 관심 종목에 등록된 이 종목의 향후 전망과 핵심 이슈를 3줄로 리포트해.");
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-[100] rounded-none shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">관심 종목</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">수급 레이더(RADAR) 가동 중</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadWatchlist}
            className={`p-3 bg-slate-100 text-slate-900 rounded-none active:scale-95 transition-all ${isRefreshing || isSyncing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {(isSyncing || isRadarLoading) && !isLoading && (
        <div className="px-6 py-2 bg-blue-600 flex items-center justify-center gap-2 animate-pulse">
           <Loader2 size={12} className="text-white animate-spin" />
           <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">실시간 시세 데이터 동기화 중...</span>
        </div>
      )}

      <div className="mt-4 px-6 space-y-3">
        {detectedSupplies.length > 0 && detectedSupplies.map((d, i) => (
          <div 
            key={`${d.ticker}-${i}`}
            onClick={() => handleRadarClick(d)}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-500 p-2 text-white"><Zap size={16} /></div>
              <div>
                <p className="text-[12px] font-black text-slate-900 uppercase">🚨 [{d.name}] {d.type} 대량 매수!</p>
                <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">순매수 TOP {d.rank} ({d.netBuyValue})</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-red-300" />
          </div>
        ))}
      </div>

      <div className="px-6 mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
             <Loader2 size={40} className="animate-spin text-slate-200" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">목록 가져오는 중...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-none p-20 text-center flex flex-col items-center gap-5">
            <Star size={48} className="text-slate-100" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">등록된 관심 종목이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {watchlist.map((stock) => {
              const changeVal = parseFloat(stock.fluctuationsRatio || '0');
              const isUp = changeVal > 0;
              const isDown = changeVal < 0;
              
              return (
                <div key={stock.itemCode} className="bg-white p-6 rounded-none border border-slate-100 flex justify-between items-center active:bg-slate-50 transition-all group" onClick={() => handleStockClick(stock)}>
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 uppercase text-[10px] font-black text-slate-300">
                      {stock.stockName.substring(0,1)}
                    </div>
                    <div>
                      <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{stock.stockName}</h4>
                      <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">
                        {stock.itemCode} <span className="mx-1">|</span> {stock.volume || '0'}주
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-[18px] font-black tabular-nums ${isUp ? 'text-red-500' : isDown ? 'text-blue-500' : 'text-slate-900'}`}>
                        {stock.closePrice === '0' ? '동기화 중' : `${stock.closePrice}원`}
                      </p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-none ${isUp ? 'bg-red-50 text-red-500' : isDown ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                        {isUp ? '+' : ''}{stock.fluctuationsRatio}%
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(stock.itemCode); }} className="p-3 bg-slate-50 text-slate-200 hover:text-red-500 rounded-none border border-slate-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[400px] rounded-none p-10 border-t-4 border-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">종목 등록</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-900 text-white p-2 rounded-none"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSimple} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">종목명 또는 단축코드</label>
                <input 
                  type="text" required placeholder="예: 005930"
                  className="w-full bg-slate-50 border border-slate-200 p-5 rounded-none font-bold text-slate-900 focus:border-blue-600 outline-none uppercase"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="w-full bg-slate-900 text-white font-black py-6 rounded-none uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">
                관심 서버 등록 완료
              </button>
            </form>
          </div>
        </div>
      )}

      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
           <div className="absolute inset-0 bg-slate-950/40" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[430px] rounded-none p-10 border-t-4 border-blue-600 animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedStock.stockName}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">HUB / {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-none border border-slate-100"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 gap-px bg-slate-100 border border-slate-100">
                 <button onClick={openChart} className="w-full flex items-center justify-between p-7 bg-slate-900 text-white rounded-none active:bg-blue-600 transition-all">
                    <div className="flex items-center gap-5"><BarChart3 size={24} className="text-blue-400" /><p className="text-[13px] font-black uppercase">실시간 차트</p></div>
                    <ChevronRight size={18} className="opacity-20" />
                 </button>
                 <button onClick={openAiDefault} className="w-full flex items-center justify-between p-7 bg-white text-slate-900 rounded-none active:bg-slate-50 transition-all">
                    <div className="flex items-center gap-5"><Bot size={24} className="text-blue-600" /><p className="text-[13px] font-black uppercase">AI 이슈 리포트</p></div>
                    <ChevronRight size={18} className="opacity-20" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
           <div className="absolute inset-0 bg-slate-950/80" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[400px] rounded-none p-12 border-4 border-slate-900 shadow-2xl">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{activeModal === 'chart' ? 'LIVE CHART' : 'AI REPORT'}</h2>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>
              <div className="min-h-[300px]">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full bg-slate-50/50 p-2 border border-slate-100">
                      {isChartLoading ? <div className="h-full flex items-center justify-center animate-pulse text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading...</div> : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}><Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} /></AreaChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-8 border-l-4 border-blue-600">
                      {isAiLoading ? <div className="py-20 flex flex-col items-center justify-center gap-6"><Sparkles size={40} className="text-blue-600 animate-pulse" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">분석 중...</p></div> : (
                        <div>
                          <p className="text-[14px] font-bold text-slate-800 uppercase leading-relaxed tracking-tight whitespace-pre-wrap">{aiAnalysis}</p>
                          <p className="text-[9px] font-bold text-slate-300 mt-10 text-center uppercase tracking-widest flex items-center justify-center gap-2"><ShieldAlert size={14} className="text-blue-500" /> 투자 주의 리포트</p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              <button onClick={() => setActiveModal(null)} className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-10 uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">닫기</button>
           </div>
        </div>
      )}
    </div>
  );
}
