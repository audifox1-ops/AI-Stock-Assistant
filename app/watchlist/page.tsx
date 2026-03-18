"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap, Check
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const WATCHLIST_STORAGE_KEY = 'myWatchlist';

interface WatchlistItem {
  ticker: string;   // 6자리 종목코드 (필수)
  stockName: string;
  currentPrice: number;
  changeRate: number;
  volume: number;
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
   * 실시간 데이터 병합 및 UI 바인딩
   */
  const fetchRealtimePrices = async (currentItems: WatchlistItem[]) => {
    if (!currentItems || currentItems.length === 0) {
      setIsSyncing(false);
      return;
    }

    const tickerRegex = /^\d{6}$/;
    const codes = currentItems
      .map(item => String(item.ticker || '').trim())
      .filter(c => tickerRegex.test(c))
      .join(',');

    if (!codes) {
      setIsSyncing(false);
      return;
    }

    try {
      setIsSyncing(true);
      const res = await fetch(`/api/market?tickers=${codes}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const rtData = data.data;

        setWatchlist(prev => {
          return prev.map(local => {
            const localTicker = String(local.ticker || '').trim();
            const rt = rtData.find((r: any) => String(r.ticker || '').trim() === localTicker);

            if (rt) {
              return {
                ...local,
                currentPrice: Number(rt.price) > 0 ? Number(rt.price) : (local.currentPrice || 0),
                changeRate: rt.changeRate !== undefined ? Number(rt.changeRate) : (local.changeRate || 0),
                volume: Number(rt.volume) > 0 ? Number(rt.volume) : (local.volume || 0)
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
      const tickerRegex = /^\d{6}$/;
      const codes = items
        .map(i => String(i.ticker || '').trim())
        .filter(c => tickerRegex.test(c));
        
      if (codes.length === 0) return;

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
  useEffect(() => {
    const initializeWatchlist = async () => {
      setIsLoading(true);
      try {
        const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map(p => ({
              ...p,
              ticker: p.ticker || p.itemCode || ''
            }));
            setWatchlist(normalized);
            await fetchRealtimePrices(normalized);
          }
        }
      } catch (e) {
        console.error('Initial Load Error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWatchlist();

    syncTimerRef.current = setInterval(() => {
      setWatchlist(current => {
        if (current.length > 0) {
          fetchRealtimePrices(current);
          checkSupplyRadar(current);
        }
        return current;
      });
    }, 60000); 

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  /**
   * 데이터 보존 (isLoading 가드 적용)
   */
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist, isLoading]);

  /**
   * 종목 검색 (디바운싱 300ms)
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
          console.error('Search API Error:', e);
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
   * 종목 실행 추가 로직
   */
  const addStockFromSearch = async (item: any) => {
    const ticker = String(item.code).trim();
    if (watchlist.some(w => String(w.ticker).trim() === ticker)) {
      alert('이미 감시 중인 종목입니다.');
      return;
    }
    const newItem: WatchlistItem = {
      ticker: ticker,
      stockName: item.name,
      currentPrice: 0,
      changeRate: 0,
      volume: 0
    };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    setSearchQuery('');
    setSearchResults([]);
    setIsAddModalOpen(false);
    await fetchRealtimePrices(updated);
  };

  /**
   * [fintech-expert] 스마트 서브밋 방어 로직 (handleManualAdd)
   * - 6자리 숫자 입력 시 API 결과 유무와 무관하게 강제 추가 (Absolute Bypass)
   * - 한글 입력 시 결과 없으면 에러 알림
   */
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // [핵심 우회 로직]: 6자리 숫자면 즉시 '직접추가'로 꽂아버림 (Vercel 차단 가드)
    if (query.length === 6 && /^\d{6}$/.test(query)) {
      addStockFromSearch({ code: query, name: '직접추가' });
      return;
    }

    // 1. 이미 렌더링된 검색 결과가 있으면 바로 첫 번째 항목 추가
    if (searchResults.length > 0) {
      addStockFromSearch(searchResults[0]);
      return;
    }

    // 2. 타이밍 문제로 아직 결과가 없다면, 즉시 백엔드 API 강제 호출
    setIsSearching(true);
    try {
      const res = await fetch(`/api/market?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        addStockFromSearch(data.data[0]);
      } else {
        // [fintech-expert] 여기서도 6자리 코드면 마지막으로 체크해서 추가
        if (query.length === 6 && /^\d{6}$/.test(query)) {
          addStockFromSearch({ code: query, name: '직접추가' });
        } else {
          alert('검색 결과가 없습니다. 종목명 또는 6자리 코드를 정확히 입력해주세요.');
        }
      }
    } catch (error) {
      console.error(error);
      if (query.length === 6 && /^\d{6}$/.test(query)) {
        addStockFromSearch({ code: query, name: '직접추가' });
      } else {
        alert('종목 검색 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const removeItem = (ticker: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setWatchlist(prev => prev.filter(item => String(item.ticker).trim() !== String(ticker).trim()));
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
      <header className="px-6 py-8 bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Market Cloud</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Real-time Watchlist Engine</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchRealtimePrices(watchlist)}
              className="p-3 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95 rounded-xl"
            >
              <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 text-white p-3 shadow-lg hover:bg-slate-800 transition-all active:scale-95 rounded-xl"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto hide-scrollbar rounded-xl">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap rounded-lg">
            <Star size={14} className="text-blue-400" /> Watchlist Portfolio
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-white text-slate-400 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border border-slate-100 italic rounded-lg">
            Live Updates Every 60s
          </div>
        </div>
      </header>

      <div className={`transition-all duration-500 overflow-hidden ${isSyncing ? 'h-6' : 'h-0'}`}>
        <div className="px-6 py-1 bg-blue-600 flex items-center justify-center gap-2">
          <Loader2 size={10} className="text-white animate-spin" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Syncing nodes...</span>
        </div>
      </div>

      <main className="px-6 mt-8 space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-slate-200" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">INITIALIZING DEPLOYMENT...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-6 shadow-sm">
            <AlertCircle size={32} className="text-slate-200" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">심볼 데이터가 비어있습니다.</p>
          </div>
        ) : (
          watchlist.map((item, idx) => {
            const isRadar = (radarStocks || []).includes(item.stockName);
            const isPlus = (item.changeRate || 0) > 0;
            const isMinus = (item.changeRate || 0) < 0;

            return (
              <div key={`${item.ticker}-${idx}`} className={`bg-white rounded-2xl border transition-all duration-300 ${isRadar ? 'border-red-500 shadow-xl' : 'border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} overflow-hidden relative group`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[11px] font-black uppercase shadow-sm transition-all group-hover:bg-slate-800 ${isRadar ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-tight">{item.stockName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mt-0.5">{item.ticker}</p>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.ticker)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 rounded-2xl overflow-hidden">
                    <div className="bg-white p-5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Pricing Terminal</p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
                        {item.currentPrice > 0 ? `${item.currentPrice.toLocaleString()}원` : '데이터 수신 중'}
                      </p>
                    </div>
                    <div className="bg-white p-5 text-right flex flex-col items-end">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Rate Change</p>
                      <span className={`text-lg font-black tabular-nums px-3 py-1 rounded-xl inline-block ${isPlus ? 'text-red-500 bg-red-50' : isMinus ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                        {isPlus ? '+' : ''}{item.changeRate.toFixed(2)}%
                      </span>
                    </div>

                    <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center px-6">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={12} className="text-blue-500" /> Volume Node
                      </span>
                      <span className="text-xs font-black text-slate-700 tabular-nums uppercase">{(item.volume || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-bold ml-0.5">SHARES</span></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[480px] p-10 rounded-[3rem] border-t-8 border-slate-900 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Symbol Radar</h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Instant addition by name or code</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl p-3 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-8">
              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Terminal</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    autoFocus
                    placeholder="종목명 또는 6자리 코드 입력"
                    className="w-full bg-slate-50 text-slate-900 border-2 border-transparent p-6 pl-16 rounded-[2rem] font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-sm uppercase tracking-wider shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {(searchResults.length > 0 || isSearching) && (
                  <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white border border-slate-100 rounded-[2rem] z-[150] max-h-80 overflow-y-auto shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
                    {isSearching && (
                      <div className="p-8 text-xs font-black text-slate-300 animate-pulse uppercase tracking-widest text-center">
                        Decrypting symbols...
                      </div>
                    )}
                    {searchResults.map((item, idx) => (
                      <div key={`${item.code}-${idx}`} onClick={() => addStockFromSearch(item)} className="p-6 flex justify-between items-center hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-50 last:border-none group transition-all">
                        <div className="flex flex-col">
                           <span className="text-base font-black tracking-tight group-hover:translate-x-1 transition-transform">{item.name}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-60">Market Node</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-400 group-hover:bg-white/10 group-hover:text-white px-3 py-1.5 rounded-xl transition-colors">{item.code}</span>
                           <Zap size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Zap size={14} fill="currentColor" /> Direct Access 
                 </p>
                 <p className="text-[11px] font-semibold text-blue-400/80 leading-relaxed">
                    6자리 코드를 입력하고 엔터를 누르면 API가 차단된 Vercel 환경에서도 **무조건 추가**됩니다.
                 </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}