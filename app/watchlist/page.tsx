"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap, Check
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const WATCHLIST_STORAGE_KEY = 'myWatchlist';

interface WatchlistItem {
  itemCode: string; // Ticker
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

  // 실시간 동기화 인터벌 타이머 레퍼런스
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 실시간 시세 동기화
   */
  const fetchRealtimePrices = async (currentItems: WatchlistItem[]) => {
    if (!currentItems || currentItems.length === 0) {
      setIsSyncing(false);
      return;
    }
    
    // 티커 목록 추출 및 정규화
    const codes = currentItems.map(item => String(item.itemCode).trim()).filter(c => c !== '').join(',');
    if (!codes) {
      setIsSyncing(false);
      return;
    }

    try {
      // 대량 요청의 경우 isSyncing 상태를 켜되, 백그라운드 폴링 중에는 사용자 경험 저하를 위해 불필요한 UI 차단 자제
      const res = await fetch(`/api/market?tickers=${codes}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const rtData = data.data; 
        
        // 데이터 병합: String().trim() 강제 매칭 및 필드명 보정
        setWatchlist(prev => {
          return prev.map(local => {
            const localCode = String(local.itemCode).trim();
            const rt = rtData.find((r: any) => String(r.ticker).trim() === localCode);
            
            if (rt) {
              return {
                ...local,
                closePrice: rt.price !== undefined ? Number(rt.price) : local.closePrice,
                fluctuationsRatio: rt.changeRate !== undefined ? String(rt.changeRate) : local.fluctuationsRatio,
                volume: rt.volume !== undefined ? Number(rt.volume) : local.volume
              };
            }
            return local;
          });
        });
      }
    } catch (e) {
      console.error('Watchlist Sync Error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * 수급 레이더 체크
   */
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
      console.error('Supply Radar Error:', e);
    }
  };

  /**
   * 저장된 관심종목 로드 및 폴링 시작
   */
  const initializeWatchlist = async () => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWatchlist(parsed);
          await fetchRealtimePrices(parsed);
        }
      }
    } catch (e) {
      console.error('Load Watchlist Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기화 및 실시간 동기화 타이머 설정 (10초 주기)
  useEffect(() => {
    initializeWatchlist();

    syncTimerRef.current = setInterval(() => {
      // 최신 상태의 watchlist를 사용하여 시세 갱신
      setWatchlist(current => {
        if (current.length > 0) {
          fetchRealtimePrices(current);
          checkSupplyRadar(current);
        }
        return current;
      });
    }, 10000); // 10초 주기

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  // 관심종목 리스트가 변할 때마다 스토리지 업데이트
  useEffect(() => {
    if (watchlist.length >= 0) {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist]);

  /**
   * 종목 검색 (디바운싱 적용)
   */
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/market?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setSearchResults(data.data);
          }
        } catch (e) {
          console.error('Search Error:', e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * 종목 추가
   */
  const addStockFromSearch = async (item: any) => {
    const ticker = String(item.code).trim();
    
    if (watchlist.some(w => String(w.itemCode).trim() === ticker)) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const newItem: WatchlistItem = {
      itemCode: ticker,
      stockName: item.name
    };

    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    setSearchQuery('');
    setSearchResults([]);
    setIsAddModalOpen(false);
    
    await fetchRealtimePrices(updated);
  };

  /**
   * 수동 직접 추가 (Ticker:Name)
   */
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    const parts = searchQuery.split(':');
    const ticker = parts[0].trim();
    const name = parts[1] ? parts[1].trim() : '직접입력';

    if (!ticker) return;

    if (watchlist.some(item => String(item.itemCode).trim() === ticker)) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const newItem: WatchlistItem = {
      itemCode: ticker,
      stockName: name
    };

    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    setSearchQuery('');
    setIsAddModalOpen(false);
    
    await fetchRealtimePrices(updated);
  };

  /**
   * 종목 제거
   */
  const removeItem = (itemCode: string) => {
    const updated = watchlist.filter(item => String(item.itemCode).trim() !== String(itemCode).trim());
    setWatchlist(updated);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32 font-sans">
      <header className="px-6 py-8 bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Market Cloud</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Real-time Watchlist Engine</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsSyncing(true);
                fetchRealtimePrices(watchlist);
              }}
              className="p-3 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95"
            >
              <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 text-white p-3 shadow-lg active:bg-blue-600 transition-all active:scale-95"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
           <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
             <Star size={14} className="text-blue-400" /> Watchlist Portfolio
           </div>
           <div className="flex items-center gap-2 px-5 py-3 bg-white text-slate-400 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border border-slate-100 italic">
             Live Updates Every 10s
           </div>
        </div>
      </header>

      {/* 실시간 싱크 바 (백그라운드용) */}
      <div className={`transition-all duration-500 overflow-hidden ${isSyncing ? 'h-6' : 'h-0'}`}>
        <div className="px-6 py-1 bg-blue-600 flex items-center justify-center gap-2">
           <Loader2 size={10} className="text-white animate-spin" />
           <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Syncing nodes...</span>
        </div>
      </div>

      {/* 수급 포착 알림 바 */}
      {(radarStocks?.length || 0) > 0 && (
        <div className="mx-6 mt-6 bg-red-600 p-5 border-l-[6px] border-red-900 shadow-xl flex items-center justify-between animate-bounce">
           <div className="flex items-center gap-4">
              <ShieldAlert size={24} className="text-white" />
              <div>
                 <p className="text-[10px] font-black text-red-200 uppercase tracking-widest leading-none mb-1">매수세 유입 포착</p>
                 <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-tight">
                    {(radarStocks || []).join(', ')} 포지션 유입!
                 </h2>
              </div>
           </div>
           <div className="w-10 h-10 bg-white/20 flex items-center justify-center font-black text-white text-xs">
              LIVE
           </div>
        </div>
      )}

      <main className="px-6 mt-8 space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-slate-200" size={40} />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">INITIALIZING DEPLOYMENT...</p>
          </div>
        ) : (!watchlist || watchlist.length === 0) ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-6">
            <AlertCircle size={32} className="text-slate-100" />
             <p className="text-xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">심볼 데이터가 비어있습니다.</p>
          </div>
        ) : (
          watchlist.map((item, idx) => {
            const isRadar = (radarStocks || []).includes(item.stockName);
            const currentPrice = (item.closePrice && item.closePrice > 0) ? item.closePrice : 0;
            const changeRate = item.fluctuationsRatio || '0.00';
            const isPlus = parseFloat(String(changeRate)) > 0;
            const isMinus = parseFloat(String(changeRate)) < 0;

            return (
              <div key={`${item.itemCode}-${idx}`} className={`bg-white border transition-all duration-300 ${isRadar ? 'border-red-500 shadow-lg' : 'border-slate-100 hover:border-blue-200 shadow-sm'}`}>
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
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Pricing Terminal</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums leading-none tracking-tight">
                         {currentPrice > 0 ? `${currentPrice.toLocaleString()}원` : '-'}
                      </p>
                    </div>
                    <div className="bg-white p-4 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Rate Change</p>
                      <span className={`text-lg font-black tabular-nums p-1 inline-block ${isPlus ? 'text-red-500 bg-red-50/50' : isMinus ? 'text-blue-500 bg-blue-50/50' : 'text-slate-400 bg-slate-50'}`}>
                        {isPlus ? '+' : ''}{changeRate}%
                      </span>
                    </div>
                    
                    <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center opacity-40">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume Node</span>
                       <span className="text-[10px] font-bold text-slate-900 tabular-nums uppercase">{(item.volume || 0).toLocaleString()} 주</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 관심종목 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[450px] p-12 border-t-8 border-slate-900 shadow-2xl">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Watchlist Add</h2>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">Search cloud database or enter ticker</p>
               </div>
               <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-900 text-white p-2"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualAdd} className="space-y-8">
               <div className="space-y-3 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Symbol Search Query</label>
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                      type="text" 
                      placeholder="종목명 또는 심볼 입력"
                      className="w-full bg-white text-slate-900 border-2 border-slate-200 p-6 pl-14 font-black outline-none focus:border-blue-500 transition-all text-sm uppercase tracking-widest"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-900 z-[150] max-h-60 overflow-y-auto shadow-2xl">
                       {isSearching && <div className="p-4 text-xs font-black text-slate-300 animate-pulse uppercase tracking-widest">Fetching...</div>}
                       {searchResults.map((item, idx) => (
                         <div key={`${item.code}-${idx}`} onClick={() => addStockFromSearch(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b border-slate-50 group transition-colors">
                            <span className="text-sm font-black text-slate-900">{item.name}</span>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 uppercase">{item.code}</span>
                               <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               <button className="w-full bg-slate-900 text-white font-black py-7 uppercase tracking-[0.3em] text-xs hover:bg-blue-600 transition-all shadow-xl active:scale-[0.98]">
                  Commit Monitoring Node
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
