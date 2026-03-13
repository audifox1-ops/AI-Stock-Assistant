"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Target, 
  ShieldAlert,
  X,
  Check,
  ChevronUp,
  AlertCircle,
  RefreshCcw,
  Trash2,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AiAnalysisResult {
  position: string;
  action: string;
  targetPrice: number;
  reason: string;
}

interface Stock {
  id: string | number;
  symbol: string; // 야후 파이낸스 심볼 (예: 005930.KS)
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  type: '단기' | '스윙' | '장기';
  target: number;
  stopLoss: number;
  supplyTrend: string;
  analysis?: AiAnalysisResult;
  error?: string;
  changePercent?: number;
  fetchError?: boolean;
}

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  fetchError?: boolean;
  analysis?: AiAnalysisResult;
  error?: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  success: boolean;
}

const STORAGE_KEY = 'ai_stock_holdings';
const INTERESTS_STORAGE_KEY = 'ai_stock_interests';

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [isInterestsLoading, setIsInterestsLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedStockId, setExpandedStockId] = useState<string | number | null>(null);
  const [expandedInterestId, setExpandedInterestId] = useState<string | number | null>(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '',
    symbol: '',
    avgPrice: 0,
    quantity: 0,
    type: '스윙',
    target: 0,
    stopLoss: 0,
    supplyTrend: '수급 분석 대기 중'
  });

  const [loadingAi, setLoadingAi] = useState<Record<string | number, boolean>>({});
  const [loadingInterestAi, setLoadingInterestAi] = useState<Record<string | number, boolean>>({});

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // 1. 시장 지수 가져오기
  const fetchMarketIndices = async () => {
    setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarketIndices(data);
      }
    } catch (error) {
      console.error("Market fetch error:", error);
    } finally {
      setIsMarketLoading(false);
    }
  };

  // 2. 보유 종목 불러오기
  const fetchHoldings = async () => {
    setIsInitialLoading(true);
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        setStocks(JSON.parse(localData));
      } catch (e) { console.error("Local storage error:", e); }
    }
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: Stock[] = data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity),
          type: item.position_type as any, target: Number(item.target_price), stopLoss: Number(item.stop_loss),
          supplyTrend: '수급 동향 조회 중...'
        }));
        setStocks(mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (err) { console.error('Supabase fetch failed:', err); }
    finally { setIsInitialLoading(false); }
  };

  // 3. 관심 종목 불러오기
  const fetchInterests = async () => {
    setIsInterestsLoading(true);
    const localData = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (localData) {
      try {
        setInterestStocks(JSON.parse(localData));
      } catch (e) { console.error("Interests local storage error:", e); }
    }
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: InterestStock[] = data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol,
          price: null, change: null, alertEnabled: item.alert_enabled,
        }));
        setInterestStocks(mapped);
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (err) { console.error("Interest fetch failed:", err); }
    finally { setIsInterestsLoading(false); }
  };

  // 4. 모든 종목 가격 통합 업데이트
  const fetchAllPrices = async () => {
    if (stocks.length === 0 && interestStocks.length === 0) return;
    setIsRefreshing(true);
    try {
      const symbols = Array.from(new Set([
        ...stocks.map(s => s.symbol),
        ...interestStocks.map(s => s.symbol)
      ])).filter(Boolean);

      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      const data = await res.json();
      
      // 보유 종목 업데이트
      setStocks(prev => {
        const next = prev.map(s => {
          const live = data[s.symbol];
          return live && live.success ? { ...s, currentPrice: live.price, changePercent: live.changePercent, fetchError: false } : (live?.error ? { ...s, fetchError: true } : s);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      // 관심 종목 업데이트
      setInterestStocks(prev => {
        const next = prev.map(s => {
          const live = data[s.symbol];
          return live && live.success ? { ...s, price: live.price, change: live.changePercent, fetchError: false } : (live?.error ? { ...s, fetchError: true } : s);
        });
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      setLastSyncTime(formatCurrentTime());
    } catch (error) { console.error("Price fetch error:", error); }
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    const init = async () => {
      fetchMarketIndices();
      await Promise.all([fetchHoldings(), fetchInterests()]);
      fetchAllPrices();
    };
    init();
    const interval = setInterval(() => { fetchAllPrices(); fetchMarketIndices(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateProfit = (stock: Stock) => {
    if (stock.currentPrice === null || stock.fetchError) return { profit: 0, rate: '0.00', isPositive: true };
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2);
    return { profit, rate, isPositive: profit >= 0 };
  };

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) { alert('필수 정보를 모두 입력해 주세요.'); return; }
    let symbol = newStock.symbol.toUpperCase().trim();
    if (!symbol.includes('.')) { if (/^\d{6}$/.test(symbol)) symbol += '.KS'; }
    try {
      const { data, error } = await supabase.from('holdings').insert([{
        symbol, stock_name: newStock.name, avg_buy_price: Number(newStock.avgPrice),
        quantity: Number(newStock.quantity), position_type: newStock.type,
        target_price: Number(newStock.target), stop_loss: Number(newStock.stopLoss)
      }]).select();
      if (error) throw error;
      if (data && data[0]) {
        fetchHoldings().then(() => fetchAllPrices());
        setIsAddModalOpen(false);
        setNewStock({ name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0, supplyTrend: '수급 분석 대기 중' });
      }
    } catch (err) { console.error('Error adding stock:', err); }
  };

  const analyzeStock = async (stock: Stock) => {
    if (stock.currentPrice === null || stock.fetchError) return;
    if (expandedStockId === stock.id) { setExpandedStockId(null); return; }
    if (stock.analysis || stock.error) { setExpandedStockId(stock.id); return; }
    setLoadingAi(prev => ({ ...prev, [stock.id]: true }));
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stock.name, currentPrice: stock.currentPrice, rate: calculateProfit(stock).rate, supplyTrend: stock.supplyTrend, type: 'holding' })
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, analysis: data.error ? undefined : data, error: data.error } : s));
      setExpandedStockId(stock.id);
    } catch (err) { setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, error: "오류 발생" } : s)); setExpandedStockId(stock.id); }
    finally { setLoadingAi(prev => ({ ...prev, [stock.id]: false })); }
  };

  const analyzeInterest = async (stock: InterestStock) => {
    if (stock.price === null || stock.fetchError) return;
    if (expandedInterestId === stock.id) { setExpandedInterestId(null); return; }
    if (stock.analysis || stock.error) { setExpandedInterestId(stock.id); return; }
    setLoadingInterestAi(prev => ({ ...prev, [stock.id]: true }));
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stock.name, currentPrice: stock.price, supplyTrend: "관심종목 분석 중", type: 'interest' })
      });
      const data = await res.json();
      setInterestStocks(prev => prev.map(s => s.id === stock.id ? { ...s, analysis: data.error ? undefined : data, error: data.error } : s));
      setExpandedInterestId(stock.id);
    } catch (err) { setInterestStocks(prev => prev.map(s => s.id === stock.id ? { ...s, error: "오류 발생" } : s)); setExpandedInterestId(stock.id); }
    finally { setLoadingInterestAi(prev => ({ ...prev, [stock.id]: false })); }
  };

  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const isTotalPositive = totalProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-36 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="p-8 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tighter">AI STOCK</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Market Status</span>
              {lastSyncTime && <span className="text-[10px] text-blue-500/80 font-black animate-pulse">{lastSyncTime}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { fetchAllPrices(); fetchMarketIndices(); }} disabled={isRefreshing} className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-all"><RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} /></button>
            <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg active:scale-90"><Plus size={20} /></button>
          </div>
        </div>

        {/* Market Indices */}
        <div className="flex gap-3 mb-6">
          {isMarketLoading ? (
            <><div className="flex-1 h-20 bg-slate-800/40 rounded-3xl animate-pulse"></div><div className="flex-1 h-20 bg-slate-800/40 rounded-3xl animate-pulse"></div></>
          ) : (
            marketIndices.map(market => {
              const isUp = market.changePercent >= 0;
              return (
                <div key={market.symbol} className="flex-1 bg-slate-800/40 border border-white/5 rounded-3xl p-4 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-ellipsis overflow-hidden whitespace-nowrap">{market.name}</span>
                    {isUp ? <ArrowUpRight size={12} className="text-red-500" /> : <ArrowDownRight size={12} className="text-blue-400" />}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black tracking-tighter">{market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className={`text-[10px] font-black ${isUp ? 'text-red-500' : 'text-blue-400'}`}>{isUp ? '+' : ''}{market.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Total Summary Widget */}
        <div className="relative overflow-hidden rounded-[2.5rem] p-1 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border border-white/10 shadow-2xl">
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.3rem] p-7 pt-8 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Portfolio Value</p>
                <h2 className="text-3xl font-black text-slate-100 tracking-tight">{(totalCurrentAmount).toLocaleString()}원</h2>
              </div>
              <div className={`px-4 py-2 rounded-2xl flex items-center gap-1.5 font-black text-sm border ${isTotalPositive ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                {isTotalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {totalBuyAmount > 0 ? (totalProfit/totalBuyAmount*100).toFixed(2) : '0.00'}%
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between gap-6">
              <div className="flex-1"><p className="text-[10px] text-slate-500 mb-1 font-bold">총 수익금</p><p className={`text-lg font-black ${isTotalPositive ? 'text-red-500' : 'text-blue-400'}`}>{isTotalPositive ? '+' : ''}{totalProfit.toLocaleString()}</p></div>
              <div className="flex-1 text-right"><p className="text-[10px] text-slate-500 mb-1 font-bold">보유 종목</p><p className="text-lg font-black text-slate-300">{stocks.length}개</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="px-8 mt-4 space-y-12">
        {/* 1. Holdings Section */}
        <section>
          <div className="flex justify-between items-center px-1 mb-6">
            <h3 className="font-black text-lg text-slate-100 flex items-center gap-2"><LayoutDashboard size={18} className="text-blue-500" /> My Portfolio</h3>
          </div>
          {isInitialLoading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : stocks.length === 0 ? (
            <div className="bg-slate-800/20 border-2 border-dashed border-white/5 rounded-[3rem] p-10 text-center"><h4 className="text-slate-500 font-bold mb-4">보유 종목이 없습니다.</h4><button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-slate-800 text-blue-500 rounded-2xl font-black border border-blue-500/30">종목 추가하기</button></div>
          ) : (
            <div className="space-y-6">
              {stocks.map(stock => {
                const { profit, rate, isPositive } = calculateProfit(stock);
                const isExpanded = expandedStockId === stock.id;
                return (
                  <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/60 transition-all group/card">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><h4 className="text-xl font-black">{stock.name}</h4></div>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest">{stock.symbol}</p>
                      </div>
                      <div className="text-right">
                        {stock.currentPrice === null ? <div className="w-20 h-6 bg-white/5 animate-pulse rounded-lg"></div> : <><div className={`text-xl font-black ${isPositive ? 'text-red-500' : 'text-blue-400'}`}>{rate}%</div><p className="text-[10px] text-slate-500 font-bold">{isPositive ? '+' : ''}{profit.toLocaleString()}원</p></>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5"><span className="text-[10px] text-slate-600 block mb-1">AVG BUY</span><span className="text-sm font-black">{stock.avgPrice.toLocaleString()}</span></div>
                      <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5"><span className="text-[10px] text-slate-600 block mb-1">LIVE</span>{stock.currentPrice === null ? <span className="animate-pulse">...</span> : <span className={`text-sm font-black ${isPositive ? 'text-red-500' : 'text-blue-400'}`}>{stock.currentPrice.toLocaleString()}</span>}</div>
                    </div>
                    <button onClick={() => analyzeStock(stock)} disabled={loadingAi[stock.id] || stock.currentPrice === null} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all ${isExpanded ? 'bg-slate-700/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                      {loadingAi[stock.id] ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Sparkles size={16} /><span>{isExpanded ? "분석 결과 접기" : "Gemini 포트폴리오 분석"}</span></>}
                    </button>
                    {isExpanded && stock.analysis && (
                      <div className="mt-6 p-6 bg-slate-900/60 rounded-3xl border border-blue-500/10 animate-in slide-in-from-top-2">
                        <div className="flex justify-between mb-4"><span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black">{stock.analysis.action}</span><span className="text-[10px] text-slate-500 font-black tracking-widest">TP: {stock.analysis.targetPrice.toLocaleString()}</span></div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">{stock.analysis.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Interests Section */}
        <section>
          <div className="flex justify-between items-center px-1 mb-6">
            <h3 className="font-black text-lg text-slate-100 flex items-center gap-2"><Bell size={18} className="text-indigo-400" /> Watchlist Special Analysis</h3>
          </div>
          {isInterestsLoading && interestStocks.length === 0 ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : interestStocks.length === 0 ? (
            <div className="bg-slate-800/20 border-2 border-dashed border-white/5 rounded-[3rem] p-10 text-center"><p className="text-slate-500 font-bold mb-4">등록된 관심 종목이 없습니다.</p></div>
          ) : (
            <div className="space-y-6">
              {interestStocks.map(stock => {
                const isExpanded = expandedInterestId === stock.id;
                const isUp = stock.change !== null && stock.change >= 0;
                return (
                  <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/60 transition-all border-l-4 border-l-indigo-500/30">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-xl font-black mb-1">{stock.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest">{stock.symbol}</p>
                      </div>
                      <div className="text-right">
                        {stock.price === null ? <div className="w-20 h-6 bg-white/5 animate-pulse rounded-lg"></div> : <><div className={`text-xl font-black ${isUp ? 'text-red-500' : 'text-blue-400'}`}>{stock.price.toLocaleString()}</div><p className={`text-[10px] font-black ${isUp ? 'text-red-500/70' : 'text-blue-400/70'}`}>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</p></>}
                      </div>
                    </div>
                    <button onClick={() => analyzeInterest(stock)} disabled={loadingInterestAi[stock.id] || stock.price === null} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all ${isExpanded ? 'bg-slate-700/50 text-slate-300' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/20'}`}>
                      {loadingInterestAi[stock.id] ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Sparkles size={16} /><span>{isExpanded ? "결과 닫기" : "AI 매수 타이밍 분석"}</span></>}
                    </button>
                    {isExpanded && stock.analysis && (
                      <div className="mt-6 p-6 bg-slate-900/60 rounded-3xl border border-indigo-500/10 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${stock.analysis.action === '매수권장' ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 text-slate-300'}`}>{stock.analysis.action}</span>
                          <span className="text-[10px] text-indigo-400 font-black tracking-widest leading-none">ENTRY: {stock.analysis.targetPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">{stock.analysis.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black text-slate-100 italic tracking-tight uppercase">Add Holding</h2></div><button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><X size={20} /></button></div>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ticker Symbol</label><input type="text" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" placeholder="005930.KS" /></div>
              <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Name</label><input type="text" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" placeholder="삼성전자" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Avg Price</label><input type="number" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Quantity</label><input type="number" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" /></div>
              </div>
              <button onClick={handleAddStock} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-lg shadow-xl active:scale-95 transition-all mt-4">Save to Portfolio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
