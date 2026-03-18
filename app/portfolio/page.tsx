"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight,
  Target, ShieldAlert, Bot, Sparkles, Loader2, X, Trash2, RefreshCcw, ChevronRight,
  AlertCircle, Search, Check
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  itemCode: string;
  stockName: string;
  avgPrice: number;
  quantity: number;
  category: string; 
  targetPrice?: number;
  stopLossPrice?: number;
  currentPrice?: number;
  changeRate?: number;
  volume?: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    itemCode: '',
    stockName: '',
    searchQuery: '',
    avgPrice: '',
    quantity: '',
    category: '스윙',
    targetPrice: '',
    stopLossPrice: ''
  });

  // 종목 검색 상태
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const avgPriceRef = useRef<HTMLInputElement>(null);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  const fetchRealtimePrices = async (currentHoldings: Holding[]) => {
    if (!currentHoldings || currentHoldings.length === 0) return;
    setIsSyncing(true);
    const codes = currentHoldings.map(h => String(h.itemCode).trim()).join(',');
    try {
      const res = await fetch(`/api/market?tickers=${codes}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const rtData = data.data;
        
        const merged = currentHoldings.map(local => {
          const rt = rtData.find((r: any) => String(r.ticker).trim() === String(local.itemCode).trim());
          if (rt && rt.price > 0) {
            return {
              ...local,
              currentPrice: Number(rt.price),
              changeRate: rt.changeRate !== undefined ? Number(rt.changeRate) : (local.changeRate || 0),
              volume: rt.volume !== undefined ? Number(rt.volume) : (local.volume || 0)
            };
          }
          return local;
        });
        
        setHoldings(merged);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.error('Portfolio Sync Error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHoldings(parsed);
          await fetchRealtimePrices(parsed);
        }
      }
    } catch (e) {
      console.error(e);
      setHoldings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 종목 검색 디바운싱
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/market?q=${encodeURIComponent(formData.searchQuery)}`);
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
  }, [formData.searchQuery]);

  /**
   * 종목 선택 시 동작 (포커스 이동 포함)
   */
  const selectSearchResult = (item: any) => {
    setFormData({
      ...formData,
      itemCode: item.code,
      stockName: item.name,
      searchQuery: item.name 
    });
    setSearchResults([]);
    setTimeout(() => avgPriceRef.current?.focus(), 100);
  };

  /**
   * [fintech-expert] 스마트 서브밋 (엔터키 자동 선택)
   */
  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.searchQuery.trim()) return;

    // 1. 이미 종목코드가 세팅된 경우 (이미 선택한 상태에서 엔터) -> 폼 제출
    if (formData.itemCode) {
      handleAddHolding(e);
      return;
    }

    // 2. 검색 결과가 있는 경우 첫 번째 결과 선택
    if (searchResults.length > 0) {
      selectSearchResult(searchResults[0]);
      return;
    }

    // 3. 실시간 검색 후 첫 번째 결과 선택
    setIsSearching(true);
    try {
      const res = await fetch(`/api/market?q=${encodeURIComponent(formData.searchQuery)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        selectSearchResult(data.data[0]);
      } else {
        alert('검색 결과가 없습니다.');
      }
    } catch (e) {
      console.error('Portfolio Smart Submit Error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredHoldings = useMemo(() => {
    const list = Array.isArray(holdings) ? holdings : [];
    if (activeFilter === '전체') return list;
    return list.filter(h => h.category === activeFilter);
  }, [holdings, activeFilter]);

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalValuation = 0;

    (filteredHoldings || []).forEach(h => {
      const current = (h.currentPrice && h.currentPrice > 0) ? h.currentPrice : (h.avgPrice || 0);
      totalInvested += (h.avgPrice || 0) * (h.quantity || 0);
      totalValuation += current * (h.quantity || 0);
    });

    const totalProfit = totalValuation - totalInvested;
    const profitRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      invested: totalInvested,
      valuation: totalValuation,
      profit: totalProfit,
      rate: profitRate
    };
  }, [filteredHoldings]);

  const handleAddHolding = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.itemCode || !formData.stockName) {
       // 종목이 아직 선택되지 않았다면 스마트 서브밋 시도
       return handleSmartSubmit(e);
    }

    if (!formData.avgPrice || !formData.quantity) {
       // 종목은 선택되었으나 가격/수량이 없는 경우 자연스럽게 포커스 유지만 (알림 X)
       avgPriceRef.current?.focus();
       return;
    }

    const newHolding: Holding = {
      itemCode: formData.itemCode.trim(),
      stockName: formData.stockName.trim(),
      avgPrice: Number(formData.avgPrice),
      quantity: Number(formData.quantity),
      category: formData.category,
      targetPrice: formData.targetPrice ? Number(formData.targetPrice) : 0,
      stopLossPrice: formData.stopLossPrice ? Number(formData.stopLossPrice) : 0,
    };

    const currentList = Array.isArray(holdings) ? holdings : [];
    const updated = [newHolding, ...currentList];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setFormData({ 
      itemCode: '', stockName: '', searchQuery: '', avgPrice: '', 
      quantity: '', category: '스윙', targetPrice: '', stopLossPrice: '' 
    });
    setSearchResults([]);
    
    await fetchRealtimePrices(updated);
  };

  const removeHolding = (itemCode: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const currentList = Array.isArray(holdings) ? holdings : [];
    const updated = currentList.filter(h => String(h.itemCode).trim() !== String(itemCode).trim());
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  };

  const analyzePortfolio = async () => {
    setIsAnalysisModalOpen(true);
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: filteredHoldings })
      });
      const data = await res.json();
      setAiAnalysis(data.diagnosis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32 font-sans">
      <header className="px-6 py-6 bg-white border-b border-slate-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">내 자산</h1>
            <p className="text-xs font-medium text-slate-500 mt-1">AI 기반 맞춤형 자산 관리</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-2xl active:scale-95 transition-all shadow-lg hover:bg-slate-800"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {['전체', '단기', '스윙', '장기'].map(f => (
            <button
               key={f}
               onClick={() => setActiveFilter(f)}
               className={`px-5 py-2.5 text-sm font-semibold transition-all rounded-xl border whitespace-nowrap ${
                activeFilter === f 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
               }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {isSyncing && (
        <div className="px-6 py-2 bg-blue-600 flex items-center justify-center gap-2 animate-pulse">
           <Loader2 size={12} className="text-white animate-spin" />
           <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">실시간 시세 데이터 동기화 중...</span>
        </div>
      )}

      <main className="px-6 mt-6 space-y-6">
        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-slate-400 mb-2">총 자산 가치</p>
            <div className="flex items-baseline gap-2 mb-8">
               <h2 className="text-3xl font-bold text-white tabular-nums tracking-tight">
                {summary.valuation.toLocaleString()}
               </h2>
               <span className="text-lg font-medium text-slate-400">원</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">총 손익</p>
                <div className={`flex items-center gap-1 ${summary.profit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                   <span className="text-lg font-bold tabular-nums tracking-tight">
                     {summary.profit >= 0 ? '+' : ''}{summary.profit.toLocaleString()}
                   </span>
                   <span className="text-sm font-medium">원</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 mb-1">수익률</p>
                <span className={`text-lg font-bold tabular-nums tracking-tight ${summary.rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                   {summary.rate >= 0 ? '+' : ''}{summary.rate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={analyzePortfolio} 
          className="w-full bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Sparkles size={20} />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-900">AI 자산 진단</span>
              <span className="block text-xs text-slate-500">내 포트폴리오는 건강한가요?</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="space-y-3">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-slate-200" size={32} />
              <p className="text-sm text-slate-400 font-medium">데이터를 불러오는 중...</p>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-16 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                <Wallet size={32} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">보유 중인 종목이 없어요</p>
                <p className="text-sm text-slate-500 mt-1">우측 상단의 + 버튼을 눌러 추가해 보세요</p>
              </div>
            </div>
          ) : (
            (filteredHoldings || []).map((h, i) => {
              const current = (h.currentPrice && h.currentPrice > 0) ? h.currentPrice : h.avgPrice;
              const profit = (current - h.avgPrice) * h.quantity;
              const rate = h.avgPrice > 0 ? ((current - h.avgPrice) / h.avgPrice) * 100 : 0;
              const isPlus = profit >= 0;

              return (
                <div key={`${h.itemCode}-${i}`} className="bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden relative">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 font-bold group-hover:bg-slate-100 transition-colors">
                        {h.stockName.substring(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{h.stockName}</h4>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-md uppercase tracking-tighter">
                            {h.category}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{h.itemCode}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-900 tabular-nums">
                         {(current || 0).toLocaleString()}원
                      </p>
                      <div className={`flex items-center justify-end gap-1 text-xs font-bold tabular-nums mt-0.5 ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                        <span>{isPlus ? '+' : ''}{rate.toFixed(2)}%</span>
                        <span className="text-[10px] opacity-70">({isPlus ? '+' : ''}{profit.toLocaleString()}원)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase">평균단가</p>
                        <p className="text-xs font-bold text-slate-700 tabular-nums mt-0.5">{(h.avgPrice || 0).toLocaleString()}원</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase">보유수량</p>
                        <p className="text-xs font-bold text-slate-700 tabular-nums mt-0.5">{(h.quantity || 0).toLocaleString()}주</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeHolding(h.itemCode)} 
                      className="p-2 text-slate-200 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {(h.targetPrice || h.stopLossPrice) ? (
                    <div className="mt-3 flex gap-2">
                      {h.targetPrice ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-500 rounded-lg">
                          <Target size={10} />
                          <span className="text-[10px] font-bold tabular-nums">목표 {h.targetPrice.toLocaleString()}원</span>
                        </div>
                      ) : null}
                      {h.stopLossPrice ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-500 rounded-lg">
                          <ShieldAlert size={10} />
                          <span className="text-[10px] font-bold tabular-nums">손절 {h.stopLossPrice.toLocaleString()}원</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[480px] rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">자산 추가</h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Search & commit portfolio node</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSmartSubmit} className="space-y-6">
               <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-slate-500 ml-1">종목 검색</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" required placeholder="종목명 입력 (엔터 시 자동 선택)" 
                        className="w-full bg-slate-50 text-slate-900 border-2 border-transparent rounded-2xl p-4 pl-12 font-bold outline-none focus:border-blue-500/20 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                        value={formData.searchQuery} onChange={e => setFormData({...formData, searchQuery: e.target.value})} />
                  </div>
                  
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl z-[150] max-h-64 overflow-y-auto shadow-2xl ring-1 ring-slate-200/50">
                       {isSearching && <div className="p-6 text-xs font-bold text-slate-300 animate-pulse text-center uppercase tracking-widest">Searching cloud...</div>}
                       {searchResults.map((item, idx) => (
                         <div key={`${item.code}-${idx}`} onClick={() => selectSearchResult(item)} className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none group transition-colors">
                            <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</span>
                               <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Symbol Node</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg group-hover:bg-blue-100 transition-colors">{item.code}</span>
                               <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">매수가</label>
                     <input type="number" required placeholder="0" ref={avgPriceRef}
                        className="w-full bg-slate-50 text-slate-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all tabular-nums shadow-inner"
                        value={formData.avgPrice} onChange={e => setFormData({...formData, avgPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 ml-1">수량</label>
                     <input type="number" required placeholder="0" 
                        className="w-full bg-slate-50 text-slate-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all tabular-nums shadow-inner"
                        value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-red-400 ml-1">목표가 (선택)</label>
                     <input type="number" placeholder="0" 
                        className="w-full bg-red-50/30 text-slate-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all tabular-nums shadow-inner"
                        value={formData.targetPrice} onChange={e => setFormData({...formData, targetPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-blue-400 ml-1">손절가 (선택)</label>
                     <input type="number" placeholder="0" 
                        className="w-full bg-blue-50/30 text-slate-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all tabular-nums shadow-inner"
                        value={formData.stopLossPrice} onChange={e => setFormData({...formData, stopLossPrice: e.target.value})} />
                  </div>
               </div>

               <div>
                 <label className="text-xs font-bold text-slate-500 ml-1 mb-2 block">포트폴리오 성격</label>
                 <div className="flex gap-2">
                    {['단기', '스윙', '장기'].map(c => (
                      <button key={c} type="button" onClick={() => setFormData({...formData, category: c})}
                        className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all ${formData.category === c ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                        {c}
                      </button>
                    ))}
                 </div>
               </div>

               <div className="pt-4">
                  <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.5rem] hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.3em] text-xs">
                    Commit to Portfolio
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
           <div className="absolute inset-0" onClick={() => !isAiLoading && setIsAnalysisModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[540px] rounded-[2.5rem] p-10 shadow-2xl overflow-hidden ring-1 ring-slate-200">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                       <Sparkles size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI 자산 진단 리포트</h2>
                 </div>
                 <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="bg-slate-50 rounded-[1.5rem] p-6 max-h-[400px] overflow-y-auto">
                 {isAiLoading ? (
                   <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <Loader2 size={32} className="text-blue-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-400">포트폴리오 분석 중...</p>
                   </div>
                 ) : (
                   <div className="text-[15px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis}
                   </div>
                 )}
              </div>
              <button onClick={() => setIsAnalysisModalOpen(false)} className="w-full bg-slate-900 text-white font-bold py-5 rounded-[1.5rem] mt-8 hover:bg-slate-800 transition-all active:scale-[0.98]">
                 확인했습니다
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
