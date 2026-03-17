"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap, Check
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
  
  // 검색 및 자동완성 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
        const rtData = data.data;
        
        // 데이터 병합(Merge) 로직 강화: 'String().trim() 형변환 및 강제 매칭' 적용
        const merged = currentItems.map(local => {
          const rt = rtData.find((r: any) => String(r.ticker).trim() === String(local.itemCode).trim());
          if (rt && rt.price > 0) {
            return {
              ...local,
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

  // 종목 검색 디바운싱
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/market?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addStockFromSearch = async (item: any) => {
    const currentList = Array.isArray(watchlist) ? watchlist : [];
    if (currentList.some(w => String(w.itemCode).trim() === String(item.code).trim())) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const newItem: WatchlistItem = {
      itemCode: item.code,
      stockName: item.name
    };

    const updated = [newItem, ...currentList];
    setWatchlist(updated);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    setSearchQuery('');
    setSearchResults([]);
    setIsAddModalOpen(false);
    
    await fetchRealtimePrices(updated);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    // "티커:종목명" 또는 "티커" 직접 입력 처리
    const parts = searchQuery.split(':');
    const code = parts[0].trim();
    const name = parts[1] ? parts[1].trim() : '신규종목';

    if (!code) return;

    const newItem: WatchlistItem = {
      itemCode: code,
      stockName: name
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
            const currentPrice = (item.closePrice && item.closePrice > 0) ? item.closePrice : 0;
            const changeRate = item.fluctuationsRatio || 0;
            const isPlus = Number(changeRate) > 0;
            const isMinus = Number(changeRate) < 0;

            return (
              <div key={`${item.itemCode}-${idx}`} className={`bg-white border rounded-none group transition-all duration-300 ${isRadar ? 'border-red-500 shadow-lg' : 'border-slate-100 hover:border-blue-200 shadow-sm'}`}>
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

                  <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 font-sans">
                    <div className="bg-white p-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Pricing Node</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums leading-none tracking-tight">
                        {currentPrice > 0 ? `${currentPrice.toLocaleString()}원` : '-'}
                      </p>
                    </div>
                    <div className="bg-white p-4 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Change Rate</p>
                      <span className={`text-lg font-black tabular-nums p-1 ${isPlus ? 'text-red-500 bg-red-50/50' : isMinus ? 'text-blue-500 bg-blue-50/50' : 'text-slate-400 bg-slate-50'}`}>
                        {isPlus ? '+' : ''}{changeRate}%
                      </span>
                    </div>
                    
                    <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center opacity-40">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume (Daily)</span>
                       <span className="text-[10px] font-bold text-slate-900 tabular-nums uppercase">{item.volume?.toLocaleString() || '-'} 주</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 관심종목 추가 모달 - 검색 연동 및 가독성 최적화 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[450px] rounded-none p-12 border-t-8 border-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Watchlist Add</h2>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">Search stock name or enter ticker</p>
               </div>
               <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-900 text-white p-2 rounded-none"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualAdd} className="space-y-8">
               <div className="space-y-3 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Search</label>
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                      type="text" 
                      placeholder="삼성전자, SK하이닉스 등 입력"
                      className="w-full bg-white text-slate-900 border-2 border-slate-200 p-6 pl-14 rounded-none font-black outline-none focus:border-blue-500 placeholder:text-slate-400 transition-all text-sm uppercase tracking-widest"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* 자동완성 검색 결과 */}
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-900 z-[150] max-h-60 overflow-y-auto shadow-2xl">
                       {isSearching && <div className="p-4 text-xs font-black text-slate-300 animate-pulse uppercase tracking-widest">Searching...</div>}
                       {searchResults.map((item, idx) => (
                         <div key={idx} onClick={() => addStockFromSearch(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b border-slate-50 group">
                            <span className="text-sm font-black text-slate-900">{item.name}</span>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase">{item.code}</span>
                               <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               <p className="text-[9px] font-bold text-slate-400 leading-relaxed italic uppercase opacity-50">
                  * Tip: You can also enter "Ticker:Name" manually.
               </p>

               <button className="w-full bg-slate-900 text-white font-black py-7 rounded-none uppercase tracking-[0.3em] text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]">
                  Commit Watchlist Node
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
