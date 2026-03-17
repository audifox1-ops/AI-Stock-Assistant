"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const WATCHLIST_STORAGE_KEY = 'myWatchlist';

interface WatchlistItem {
  itemCode: string;
  stockName: string;
  closePrice?: number;
  fluctuationsRatio?: string | number;
  volume?: string | number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 수급 레이더 알림 상태
  const [radarStocks, setRadarStocks] = useState<string[]>([]);

  const fetchRealtimePrices = async (currentItems: WatchlistItem[]) => {
    if (!currentItems || currentItems.length === 0) return;
    setIsSyncing(true);
    const codes = currentItems.map(item => String(item.itemCode).trim()).join(',');
    try {
      const res = await fetch(`/api/market?tickers=${codes}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const rtData = data.data; // [{ ticker, price, changeRate, volume }, ...]
        
        // 데이터 병합(Merge) 로직: 'String() 형변환 및 강제 매칭' 적용
        const merged = currentItems.map(local => {
          // 서버 ticker와 로컬 itemCode를 강제로 String으로 변환하여 매칭 실패 차단
          const rt = rtData.find((r: any) => String(r.ticker).trim() === String(local.itemCode).trim());
          if (rt && rt.price > 0) {
            return {
              ...local,
              // 실시간 가격(rt.price)을 Number 타입으로 강제 주입
              closePrice: Number(rt.price),
              fluctuationsRatio: rt.changeRate !== undefined ? Number(rt.changeRate) : (local.fluctuationsRatio || 0),
              volume: rt.volume !== undefined ? Number(rt.volume) : (local.volume || 0)
            };
          }
          return local;
        });
        
        setWatchlist(merged);
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.error('Watchlist Sync Error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkSupplyRadar = async (items: WatchlistItem[]) => {
    if (!items || items.length === 0) return;
    try {
      const codes = items.map(i => String(i.itemCode).trim());
      const res = await fetch('/api/supply-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: codes })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.radarStocks)) {
        setRadarStocks(data.radarStocks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadWatchlist = async () => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWatchlist(parsed);
          await Promise.all([
            fetchRealtimePrices(parsed),
            checkSupplyRadar(parsed)
          ]);
        }
      }
    } catch (e) {
      console.error(e);
      setWatchlist([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    const [code, name] = searchQuery.split(':');
    if (!code) return;

    const newItem: WatchlistItem = {
      itemCode: code.trim(),
      stockName: name ? name.trim() : '신규종목'
    };

    const currentList = Array.isArray(watchlist) ? watchlist : [];
    if (currentList.some(item => String(item.itemCode).trim() === String(newItem.itemCode).trim())) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const updated = [newItem, ...currentList];
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    setSearchQuery('');
    setIsAddModalOpen(false);
    
    await fetchRealtimePrices(updated);
  };

  const removeItem = (itemCode: string) => {
    const currentList = Array.isArray(watchlist) ? watchlist : [];
    const updated = currentList.filter(item => String(item.itemCode).trim() !== String(itemCode).trim());
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      <header className="px-6 py-8 bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Market Cloud</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Real-time Watchlist Engine</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all shadow-lg"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
           <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
             <Star size={14} className="text-blue-400" /> My List
           </div>
           <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border border-slate-100">
             Total {watchlist?.length || 0} Stocks
           </div>
        </div>
      </header>

      {isSyncing && (
        <div className="px-6 py-2 bg-blue-600 flex items-center justify-center gap-2 animate-pulse">
           <Loader2 size={12} className="text-white animate-spin" />
           <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">서버 데이터 실시간 동기화 중...</span>
        </div>
      )}

      {/* 수급 포착 알림 바 */}
      {(radarStocks?.length || 0) > 0 && (
        <div className="mx-6 mt-6 bg-red-600 p-5 rounded-none border-l-[6px] border-red-900 shadow-xl flex items-center justify-between animate-bounce">
           <div className="flex items-center gap-4">
              <ShieldAlert size={24} className="text-white" />
              <div>
                 <p className="text-[10px] font-black text-red-200 uppercase tracking-widest leading-none mb-1">매수세 유입 포착</p>
                 <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-tight">
                    {(radarStocks || []).join(', ')} 포지션 유입!
                 </h2>
              </div>
           </div>
           <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
           </div>
        </div>
      )}

      <main className="px-6 mt-8 space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-slate-200" size={40} />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">SYNCING DATA...</p>
          </div>
        ) : (!watchlist || watchlist.length === 0) ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-6">
            <AlertCircle size={32} className="text-slate-100" />
            <div>
               <p className="text-xs font-black text-slate-300 uppercase tracking-widest">와치리스트가 비어있습니다</p>
            </div>
          </div>
        ) : (
          (watchlist || []).map((item, idx) => {
            const isRadar = (radarStocks || []).includes(item.stockName);
            // 실시간 가격(closePrice)이 0보다 크면 무조건 최우선 적용
            const currentPrice = (item.closePrice && item.closePrice > 0) ? item.closePrice : 0;
            const changeRate = item.fluctuationsRatio || 0;
            const isPlus = Number(changeRate) > 0;

            return (
              <div key={`${item.itemCode}-${idx}`} className={`bg-white border rounded-none group transition-all duration-300 ${isRadar ? 'border-red-500 shadow-lg' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 flex items-center justify-center text-[11px] font-black uppercase ${isRadar ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{item.stockName}</h3>
                        <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{item.itemCode}</p>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.itemCode)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50">
                    <div className="bg-white p-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">현재가</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums leading-none tracking-tight">
                        {currentPrice > 0 ? `${currentPrice.toLocaleString()}원` : '-'}
                      </p>
                    </div>
                    <div className="bg-white p-4 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">등락률</p>
                      <span className={`text-lg font-black tabular-nums ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                        {isPlus ? '+' : ''}{changeRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 등록 모달 - 가독성 개선 버전 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[450px] rounded-none p-10 border-t-8 border-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">종목 수동 추가</h2>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">티커와 종목명을 입력하세요</p>
               </div>
               <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-900 text-white p-2 rounded-none"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddStock} className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Or Input (005930:삼성전자)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="005930:삼성전자 형태 입력"
                      // 가독성 확보를 위한 스타일 강제 지정
                      className="w-full bg-white text-slate-900 border-2 border-slate-200 p-6 pl-12 rounded-none font-black outline-none focus:border-blue-500 placeholder:text-slate-400 transition-all text-sm uppercase tracking-widest"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
               </div>

               <button className="w-full bg-slate-900 text-white font-black py-7 rounded-none uppercase tracking-[0.3em] text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]">
                  Asset Registration
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
