"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Star, Trash2, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap, Check
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const WATCHLIST_STORAGE_KEY = 'myWatchlist';

interface WatchlistItem {
  ticker?: string;   // Ticker (v2)
  itemCode?: string; // Ticker (v1)
  stockName: string;
  currentPrice?: number;
  changeRate?: number;
  volume?: number;
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
   * 실시간 시세 동기화 (강제 병합 로직 + 6자리 숫자 필터링 강화)
   */
  const fetchRealtimePrices = async (currentItems: WatchlistItem[]) => {
    if (!currentItems || currentItems.length === 0) {
      setIsSyncing(false);
      return;
    }

    // [방어 코드]: 6자리 숫자가 아닌 티커는 API 요청 대항에서 제외 (NaN 및 429 방지)
    const tickerRegex = /^\d{6}$/;
    const codes = currentItems
      .map(item => String(item.ticker || item.itemCode || '').trim())
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

        // [매칭 절대 규칙] 및 실시간 값 덮어쓰기 적용
        setWatchlist(prev => {
          return prev.map(local => {
            const localTicker = String(local.ticker || local.itemCode || '').trim();
            const rt = rtData.find((r: any) => String(r.ticker || '').trim() === localTicker);

            if (rt) {
              return {
                ...local,
                currentPrice: rt.price ? Number(rt.price) : (local.currentPrice || 0),
                changeRate: rt.changeRate !== undefined ? Number(rt.changeRate) : (local.changeRate || 0),
                volume: rt.volume ? Number(rt.volume) : (local.volume || 0)
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
        .map(i => String(i.ticker || i.itemCode || '').trim())
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

  // 초기화 및 실시간 동기화 타이머 설정 (60초 주기로 변경하여 429 방어)
  useEffect(() => {
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

  // [수정 포인트]: 초기 로딩이 끝난 후에만 로컬 스토리지를 업데이트하여 데이터 증발 버그 차단!
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist, isLoading]);

  /**
   * 종목 검색 (자동완성)
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
        searchResults.length > 0 && setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * 검색 결과 리스트에서 클릭하여 추가
   */
  const addStockFromSearch = async (item: any) => {
    const ticker = String(item.code).trim();

    if (watchlist.some(w => String(w.ticker || w.itemCode || '').trim() === ticker)) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const newItem: WatchlistItem = {
      ticker: ticker,
      itemCode: ticker,
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
   * 수동 직접 추가 (Enter) - 자동 검색 및 6자리 코드 변환 로직 구현
   */
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    let ticker = searchQuery.trim();
    let stockName = '직접입력';

    // 만약 한글명이나 6자리 숫자가 아닌 긴 이름이 들어왔다면 백그라운드 검색 실행
    const tickerRegex = /^\d{6}$/;
    if (!tickerRegex.test(ticker)) {
      try {
        setIsSyncing(true);
        const res = await fetch(`/api/market?q=${encodeURIComponent(ticker)}`);
        const data = await res.json();
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // 가장 유사한 첫 번째 결과의 코드와 이름을 사용
          ticker = data.data[0].code;
          stockName = data.data[0].name;
        } else {
          alert('검색된 종목이 없습니다. 정확한 종목코드(6자리)나 종목명을 입력해주세요.');
          return;
        }
      } catch (err) {
        console.error('Auto Search Error:', err);
        alert('종목 검색 중 오류가 발생했습니다.');
        return;
      } finally {
        setIsSyncing(false);
      }
    }

    // 중복 체크
    if (watchlist.some(item => String(item.ticker || item.itemCode || '').trim() === ticker)) {
      alert('이미 등록된 종목입니다.');
      return;
    }

    const newItem: WatchlistItem = {
      ticker: ticker,
      itemCode: ticker,
      stockName: stockName === '직접입력' ? ticker : stockName,
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
   * 종목 제거
   */
  const removeItem = (ticker: string) => {
    const updated = watchlist.filter(item => String(item.ticker || item.itemCode || '').trim() !== String(ticker).trim());
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
                fetchRealtimePrices(watchlist);
              }}
              className="p-3 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95 rounded-xl"
            >
              <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 text-white p-3 shadow-lg active:bg-blue-600 transition-all active:scale-95 rounded-xl"
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

      {/* 실시간 싱크 바 */}
      <div className={`transition-all duration-500 overflow-hidden ${isSyncing ? 'h-6' : 'h-0'}`}>
        <div className="px-6 py-1 bg-blue-600 flex items-center justify-center gap-2">
          <Loader2 size={10} className="text-white animate-spin" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Syncing nodes...</span>
        </div>
      </div>

      {/* 수급 포착 알림 바 */}
      {(radarStocks?.length || 0) > 0 && (
        <div className="mx-6 mt-6 bg-red-600 p-5 border-l-[6px] border-red-900 shadow-xl flex items-center justify-between animate-pulse rounded-xl">
          <div className="flex items-center gap-4">
            <ShieldAlert size={24} className="text-white" />
            <div>
              <p className="text-[10px] font-black text-red-200 uppercase tracking-widest leading-none mb-1">매수세 유입 포착</p>
              <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-tight">
                {(radarStocks || []).join(', ')} 포지션 유입!
              </h2>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/20 flex items-center justify-center font-black text-white text-xs rounded-lg">
            LIVE
          </div>
        </div>
      )}

      <main className="px-6 mt-8 space-y-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <Loader2 className="animate-spin text-slate-300" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">INITIALIZING DEPLOYMENT...</p>
          </div>
        ) : (!watchlist || watchlist.length === 0) ? (
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
              <div key={`${item.ticker || item.itemCode}-${idx}`} className={`bg-white rounded-2xl border transition-all duration-300 ${isRadar ? 'border-red-500 shadow-xl' : 'border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black uppercase shadow-sm ${isRadar ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{item.stockName}</h3>
                        <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{item.ticker || item.itemCode}</p>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.ticker || item.itemCode || '')} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 rounded-xl overflow-hidden">
                    <div className="bg-white p-5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Pricing Terminal</p>
                      <p className="text-xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
                        {item.currentPrice ? `${item.currentPrice.toLocaleString()}원` : '0원'}
                      </p>
                    </div>
                    <div className="bg-white p-5 text-right flex flex-col items-end">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Rate Change</p>
                      <span className={`text-lg font-black tabular-nums px-2 py-0.5 rounded-lg inline-block ${isPlus ? 'text-red-500 bg-red-50' : isMinus ? 'text-blue-500 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                        {isPlus ? '+' : ''}{item.changeRate?.toFixed(2)}%
                      </span>
                    </div>

                    <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center opacity-70">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <BarChart3 size={12} /> Volume Node
                      </span>
                      <span className="text-[11px] font-black text-slate-700 tabular-nums uppercase">{(item.volume || 0).toLocaleString()} 주</span>
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
          <div className="relative bg-white w-full max-w-[450px] p-10 rounded-[2rem] border-t-8 border-slate-900 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Watchlist Add</h2>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">Search cloud database</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl p-3 transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-8">
              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Symbol Search Query</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="종목명 또는 심볼 입력 (예: 삼성전자)"
                    className="w-full bg-slate-50 text-slate-900 border-2 border-slate-200 p-5 pl-14 rounded-2xl font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-sm uppercase tracking-wider"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {(searchResults.length > 0 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl z-[150] max-h-60 overflow-y-auto shadow-2xl">
                    {isSearching && <div className="p-6 text-xs font-black text-slate-400 animate-pulse uppercase tracking-widest text-center">Fetching data...</div>}
                    {searchResults.map((item, idx) => (
                      <div key={`${item.code}-${idx}`} onClick={() => addStockFromSearch(item)} className="p-5 flex justify-between items-center hover:bg-blue-50 cursor-pointer border-b border-slate-50 group transition-colors">
                        <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 uppercase tracking-widest bg-slate-100 group-hover:bg-blue-100 px-2 py-1 rounded-md">{item.code}</span>
                          <Check size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs hover:bg-blue-600 hover:-translate-y-0.5 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]">
                Commit Monitoring Node
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}