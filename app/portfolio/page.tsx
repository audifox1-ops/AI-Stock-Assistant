"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Wallet, TrendingUp, TrendingDown, Trash2, 
  RefreshCcw, Loader2, X, AlertCircle, PieChart, BarChart3, 
  ArrowRight, Info, Check, Zap, Sparkles, BrainCircuit, LineChart
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  itemCode: string;
  stockName: string;
  purchasePrice: number;
  quantity: number;
  currentPrice: number;
  changeRate: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);

  // 추가 폼 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 실시간 시세 동기화
   */
  const fetchRealtimePrices = async (currentHoldings: Holding[]) => {
    if (!currentHoldings || currentHoldings.length === 0) {
      setIsSyncing(false);
      return;
    }

    const tickerRegex = /^\d{6}$/;
    const codes = currentHoldings
      .map(h => String(h.itemCode || '').trim())
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
        setHoldings(prev => {
          return prev.map(local => {
            const rt = rtData.find((r: any) => String(r.ticker).trim() === String(local.itemCode).trim());
            if (rt) {
              return {
                ...local,
                currentPrice: Number(rt.price) > 0 ? Number(rt.price) : local.currentPrice,
                changeRate: rt.changeRate !== undefined ? Number(rt.changeRate) : local.changeRate
              };
            }
            return local;
          });
        });
      }
    } catch (e) {
      console.error('Portfolio Sync Error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * 포트폴리오 로드
   */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
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
        console.error('Init Error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    syncTimerRef.current = setInterval(() => {
      setHoldings(curr => {
        if (curr.length > 0) fetchRealtimePrices(curr);
        return curr;
      });
    }, 60000);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  /**
   * 데이터 저장
   */
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
    }
  }, [holdings, isLoading]);

  /**
   * 검색 디바운싱
   */
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && !selectedStock) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/market?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.data || []);
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
  }, [searchQuery, selectedStock]);

  const selectStock = (stock: any) => {
    setSelectedStock(stock);
    setSearchQuery(stock.name);
    setSearchResults([]);
  };

  /**
   * [fintech-expert] 스마트 서브밋 방어 로직 (handleManualAdd)
   * - 6자리 숫자 입력 시 즉시 '알수없음'으로 종목 선택 처리 (Fallback)
   */
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStock) {
       // 이미 선택된 종목이 있다면 수량/단가 입력 필드로 포커스 이동 (또는 추가 로직 실행)
       const priceInput = document.getElementById('purchasePrice');
       priceInput?.focus();
       return;
    }

    const query = searchQuery.trim();
    if (!query) return;

    // [핵심 우회 로직]: 6자리 숫자면 즉시 선택 처리하여 차단 환경 대응
    if (query.length === 6 && /^\d{6}$/.test(query)) {
      selectStock({ code: query, name: '알수없음(직접입력)' });
      return;
    }

    if (searchResults.length > 0) {
      selectStock(searchResults[0]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/market?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        selectStock(data.data[0]);
      } else {
        // [fintech-expert] Fallback: 검색 실패하더라도 6자리 코드면 강제 선택
        if (query.length === 6 && /^\d{6}$/.test(query)) {
          selectStock({ code: query, name: '알수없음(직접입력)' });
        } else {
          alert('검색 결과가 없습니다. 종목명 또는 6자리 코드를 정확히 입력해주세요.');
        }
      }
    } catch (e) {
      console.error(e);
      if (query.length === 6 && /^\d{6}$/.test(query)) {
        selectStock({ code: query, name: '알수없음(직접입력)' });
      } else {
        alert('검색 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) {
      handleManualAdd(e); // 종목 미선택 시 스마트 서브밋 시도
      return;
    }
    if (!purchasePrice || !quantity) return;

    const newHolding: Holding = {
      itemCode: selectedStock.code,
      stockName: selectedStock.name,
      purchasePrice: Number(purchasePrice),
      quantity: Number(quantity),
      currentPrice: 0,
      changeRate: 0
    };

    const updated = [newHolding, ...holdings];
    setHoldings(updated);
    
    // 상태 초기화
    setSelectedStock(null);
    setSearchQuery('');
    setPurchasePrice('');
    setQuantity('');
    setIsAddModalOpen(false);
    
    fetchRealtimePrices(updated);
  };

  const removeHolding = (idx: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setHoldings(prev => prev.filter((_, i) => i !== idx));
  };

  /**
   * AI 포트폴리오 진단
   */
  const analyzePortfolio = async () => {
    if (holdings.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisReport(null);
    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisReport(data.report);
      }
    } catch (e) {
      console.error('AI Analysis Error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 총 자산 계산
  const totalPurchase = holdings.reduce((acc, curr) => acc + (curr.purchasePrice * curr.quantity), 0);
  const totalValue = holdings.reduce((acc, curr) => acc + (curr.currentPrice * curr.quantity), 0);
  const totalProfit = totalValue - totalPurchase;
  const totalProfitRate = totalPurchase > 0 ? (totalProfit / totalPurchase) * 100 : 0;

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
      <header className="px-6 py-8 bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Portfolio Hub</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Asset Management Node</p>
          </div>
          <div className="flex gap-2">
            <button
               onClick={analyzePortfolio}
               disabled={isAnalyzing || holdings.length === 0}
               className="bg-blue-600 text-white px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
            >
              <BrainCircuit size={16} className={isAnalyzing ? 'animate-pulse' : ''} />
              {isAnalyzing ? 'Analyzing...' : 'AI Audit'}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 text-white p-3 shadow-lg hover:bg-slate-800 transition-all active:scale-95 rounded-xl"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
               <Wallet size={48} />
            </div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Total Asset Value</p>
            <h2 className="text-xl font-black tabular-nums tracking-tight">{totalValue.toLocaleString()}원</h2>
          </div>
          <div className={`rounded-2xl p-5 shadow-lg border-2 relative overflow-hidden group transition-colors ${totalProfit >= 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
               <TrendingUp size={48} className={totalProfit >= 0 ? 'text-red-500' : 'text-blue-500'} />
            </div>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${totalProfit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>Current Return</p>
            <h2 className={`text-xl font-black tabular-nums tracking-tight ${totalProfit >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
               {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}원
               <span className="text-[10px] ml-1.5 opacity-60">({totalProfitRate.toFixed(2)}%)</span>
            </h2>
          </div>
        </div>
      </header>

      {/* 실시간 싱크 바 */}
      <div className={`transition-all duration-500 overflow-hidden ${isSyncing ? 'h-6' : 'h-0'}`}>
        <div className="px-6 py-1 bg-slate-800 flex items-center justify-center gap-2">
          <Loader2 size={10} className="text-blue-400 animate-spin" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Updating market nodes...</span>
        </div>
      </div>

      <main className="px-6 mt-8 space-y-6">
        {analysisReport && (
          <div className="bg-white rounded-3xl border-2 border-blue-500 p-8 shadow-2xl shadow-blue-100 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5">
                <Sparkles size={120} className="text-blue-500" />
             </div>
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                   <BrainCircuit size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase">AI Portfolio Audit Report</h3>
                <button onClick={() => setAnalysisReport(null)} className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors">
                   <X size={18} className="text-slate-400" />
                </button>
             </div>
             <div className="prose prose-slate max-w-none">
                <div className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   {analysisReport}
                </div>
             </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Holding Assets</h3>
           <div className="h-px flex-1 bg-slate-100 mx-4"></div>
           <PieChart size={14} className="text-slate-300" />
        </div>

        {holdings.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-6">
            <AlertCircle size={32} className="text-slate-200" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">보유 중인 자산이 없습니다.<br/>우측 상단 + 버튼으로 등록하세요.</p>
          </div>
        ) : (
          holdings.map((item, idx) => {
            const currentTotal = item.currentPrice * item.quantity;
            const itemProfit = currentTotal - (item.purchasePrice * item.quantity);
            const itemProfitRate = (itemProfit / (item.purchasePrice * item.quantity)) * 100;
            const isPlus = itemProfit >= 0;

            return (
              <div key={`${item.itemCode}-${idx}`} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 overflow-hidden group">
                <div className="p-7">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-200 group-hover:bg-blue-600 transition-colors">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-tight">{item.stockName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{item.itemCode}</span>
                           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                           <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{item.quantity} SHARES</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeHolding(idx)} className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 rounded-[1.5rem] overflow-hidden">
                    <div className="bg-white p-5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Valuation</p>
                      <p className="text-xl font-black text-slate-900 tabular-nums tracking-tight">
                        {currentTotal > 0 ? `${currentTotal.toLocaleString()}원` : '평가 중...'}
                      </p>
                    </div>
                    <div className={`p-5 text-right flex flex-col items-end transition-colors ${isPlus ? 'bg-red-50/30' : 'bg-blue-50/30'}`}>
                      <p className={`text-[9px] font-bold uppercase mb-2 tracking-widest ${isPlus ? 'text-red-400' : 'text-blue-400'}`}>Profit/Loss</p>
                      <div className={`flex items-center gap-2 ${isPlus ? 'text-red-600' : 'text-blue-600'}`}>
                         {isPlus ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                         <span className="text-xl font-black tabular-nums tracking-tight">
                            {isPlus ? '+' : ''}{itemProfitRate.toFixed(2)}%
                         </span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center px-6">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Purchase Node</span>
                          <span className="text-xs font-bold text-slate-500 tabular-nums">{item.purchasePrice.toLocaleString()}원</span>
                       </div>
                       <ArrowRight size={14} className="text-slate-200" />
                       <div className="flex flex-col text-right">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Current Terminal</span>
                          <span className="text-xs font-bold text-slate-900 tabular-nums">{item.currentPrice.toLocaleString()}원</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[520px] p-10 rounded-[3rem] border-t-8 border-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Asset Registration</h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Register new holding to your node</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl p-3 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddHolding} className="space-y-8">
              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Symbol Search</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    disabled={!!selectedStock}
                    placeholder="종목명 또는 6자리 코드 입력"
                    className="w-full bg-slate-50 text-slate-900 border-2 border-transparent p-6 pl-16 rounded-[2rem] font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:bg-slate-100 shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {selectedStock && (
                    <button 
                      type="button"
                      onClick={() => { setSelectedStock(null); setSearchQuery(''); }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 font-black p-2 bg-blue-50 rounded-xl"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* 자동완성 결과 */}
                {(searchResults.length > 0 || isSearching) && !selectedStock && (
                  <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white border border-slate-100 rounded-[2.5rem] z-[150] max-h-80 overflow-y-auto shadow-2xl ring-1 ring-slate-900/10 overflow-hidden">
                    {isSearching && (
                      <div className="p-8 text-xs font-black text-slate-300 animate-pulse uppercase tracking-widest text-center">
                        Decrypting symbols...
                      </div>
                    )}
                    {searchResults.map((item, idx) => (
                      <div key={`${item.code}-${idx}`} onClick={() => selectStock(item)} className="p-6 flex justify-between items-center hover:bg-slate-900 hover:text-white cursor-pointer border-b border-slate-50 last:border-none group transition-all">
                        <div className="flex flex-col">
                           <span className="text-base font-black tracking-tight group-hover:translate-x-1 transition-transform">{item.name}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Ticker Node</span>
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

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AVG Price</label>
                  <input
                    id="purchasePrice"
                    type="number"
                    placeholder="0"
                    className="w-full bg-slate-50 text-slate-900 border-2 border-transparent p-6 rounded-[2rem] font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-sm shadow-inner"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-slate-50 text-slate-900 border-2 border-transparent p-6 rounded-[2rem] font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-sm shadow-inner"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                 <button
                    type="submit"
                    className="w-full bg-slate-900 text-white p-7 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-[0.98] group flex items-center justify-center gap-3"
                 >
                    {selectedStock ? 'Deploy Holding Asset' : 'Verify Symbol first'}
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors">
                       <Check size={18} />
                    </div>
                 </button>
                 
                 <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                       <Zap size={14} fill="currentColor" /> Direct Access 
                    </p>
                    <p className="text-[11px] font-semibold text-blue-400/80 leading-relaxed">
                       6자리 코드를 입력하고 엔터를 누르면 서버 응답과 관계없이 즉시 종목이 선택됩니다. (네이버 IP 차단 우회용)
                    </p>
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
