"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, ChevronRight, Loader2,
  X, Info, RefreshCcw, BarChart3, LineChart as LineChartIcon, Bot, Sparkles, ShieldAlert
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

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 인터랙션 상태
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // 로컬 스토리지 데이터 로드
  const loadWatchlist = () => {
    setIsRefreshing(true);
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
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
  };

  const handleAddSimple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    // 심플 추가: 종목명/코드를 기반으로 기본 객체 생성
    const newStock: Stock = {
      itemCode: searchQuery.match(/\d{6}/) ? searchQuery : '000000',
      stockName: searchQuery,
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
  };

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  // 차트/AI 기능 - [21차] 방어 로직 강화 및 한글화
  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setIsChartLoading(true);

    const mockData = [
      { time: '09:00', price: 50000 },
      { time: '11:00', price: 51200 },
      { time: '13:00', price: 50800 },
      { time: '15:30', price: 52000 },
    ];

    try {
      const res = await fetch(`/api/naver?mode=chart&itemCode=${selectedStock.itemCode}`);
      const data = await res.json();
      if (data.price && data.price.length > 0) {
        setChartData(data.price.map((p: any) => ({
          time: p.localDate.substring(4, 8),
          price: p.closePrice
        })));
      } else {
        setChartData(mockData);
      }
    } catch (e) {
      setChartData(mockData);
    }
    finally { setIsChartLoading(false); }
  };

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
          changePercent: selectedStock.fluctuationsRatio,
          instruction: "현재 관심 종목에 등록된 이 종목의 향후 전망과 핵심 이슈를 3줄로 리포트해."
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally { setIsAiLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">관심 리스트를 불러오고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      {/* 헤더 - [21차] 한글화 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50 rounded-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">관심 종목</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">나만의 전략 자산 허브</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="px-6 mt-6">
        {/* 리스트 - [21차] 한글화 */}
        {watchlist.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-none p-20 text-center flex flex-col items-center gap-5">
            <Star size={48} className="text-slate-100" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">등록된 관심 종목이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {watchlist.map((stock) => {
              const isUp = parseFloat(stock.fluctuationsRatio) > 0;
              return (
                <div key={stock.itemCode} className="bg-white p-7 rounded-none border border-slate-100 flex justify-between items-center active:bg-slate-50 transition-all" onClick={() => handleStockClick(stock)}>
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100">
                      <Star size={18} className="text-blue-500" fill="#3b82f6" />
                    </div>
                    <div>
                      <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{stock.stockName}</h4>
                      <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">{stock.itemCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[18px] font-black text-slate-900 tabular-nums">{stock.closePrice === '0' ? '대기 중' : stock.closePrice}</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-none ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} border border-current/10`}>
                        {isUp ? '+' : ''}{stock.fluctuationsRatio}%
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(stock.itemCode); }}
                      className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 rounded-none border border-slate-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 모달 - [21차] 한글화 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[400px] rounded-none p-12 shadow-none border-t-4 border-slate-900">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">새 관심 종목 등록</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSimple} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">종목명 또는 코드</label>
                <input 
                  type="text" required placeholder="예: 삼성전자 또는 005930"
                  className="w-full bg-slate-50 border border-slate-200 p-5 rounded-none font-bold text-slate-900 focus:border-blue-600 outline-none uppercase transition-all"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="w-full bg-slate-900 text-white font-black py-6 rounded-none uppercase tracking-widest text-xs hover:bg-blue-600 transition-all font-sans">
                관심 정찰병 등록
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 바텀 시트 - [21차] 한글화 */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-0 pb-0">
           <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-none" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[430px] rounded-none p-10 shadow-none border-t-4 border-blue-600 animate-in slide-in-from-bottom-full duration-500">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedStock.stockName}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-2">상세 지표 허브 / {selectedStock.itemCode}</p>
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
                       <p className="text-[13px] font-black uppercase tracking-widest font-sans">AI 종목 이슈 분석</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-200" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 전용 모달 - [21차] 차트 높이 고정 및 한글화 */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[400px] rounded-none p-12 shadow-none border-4 border-slate-900">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                    {activeModal === 'chart' ? '실시간 차트' : 'AI 분석 리포트'}
                 </h2>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>

              <div className="min-h-[300px]">
                 {activeModal === 'chart' ? (
                   <div className="h-[300px] w-full bg-slate-50/50 border border-slate-100 p-2">
                      {isChartLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-5 uppercase text-[10px] font-black text-slate-200 tracking-widest">분석 데이터 구성 중...</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <Area type="step" dataKey="price" stroke="#2563eb" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} animationDuration={500} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-8 border-l-4 border-blue-600">
                      {isAiLoading ? (
                        <div className="py-20 flex justify-center uppercase text-[10px] font-black text-slate-300 tracking-[0.4em]">통찰력 도출 중...</div>
                      ) : (
                        <p className="text-[14px] font-bold text-slate-800 uppercase leading-relaxed tracking-tight">{aiAnalysis}</p>
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
