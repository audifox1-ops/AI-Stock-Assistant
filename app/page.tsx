"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  X,
  RefreshCcw,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Flame,
  Trophy,
  ChevronDown,
  ChevronUp
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
  symbol: string;
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
  volume?: number;
  avgVolume?: number;
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
  volume?: number;
  avgVolume?: number;
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
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0, supplyTrend: '수급 분석 대기 중'
  });

  const [loadingAi, setLoadingAi] = useState<Record<string | number, boolean>>({});
  const [loadingInterestAi, setLoadingInterestAi] = useState<Record<string | number, boolean>>({});

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  const fetchMarketIndices = async () => {
    setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error("Market fetch error:", error); }
    finally { setIsMarketLoading(false); }
  };

  const fetchHoldings = async () => {
    setIsInitialLoading(true);
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try { setStocks(JSON.parse(localData)); } catch (e) { console.error("Local storage error:", e); }
    }
    try {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
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

  const fetchInterests = async () => {
    setIsInterestsLoading(true);
    const localData = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (localData) {
      try { setInterestStocks(JSON.parse(localData)); } catch (e) { console.error("Interests local storage error:", e); }
    }
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: InterestStock[] = data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null, alertEnabled: item.alert_enabled,
        }));
        setInterestStocks(mapped);
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (err) { console.error("Interest fetch failed:", err); }
    finally { setIsInterestsLoading(false); }
  };

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
      
      setStocks(prev => {
        const next = prev.map(s => {
          const live = data[s.symbol];
          return live && live.success ? { 
            ...s, 
            currentPrice: live.price, 
            changePercent: live.changePercent, 
            volume: live.volume,
            avgVolume: live.avgVolume,
            fetchError: false 
          } : (live?.error ? { ...s, fetchError: true } : s);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });

      setInterestStocks(prev => {
        const next = prev.map(s => {
          const live = data[s.symbol];
          return live && live.success ? { 
            ...s, 
            price: live.price, 
            change: live.changePercent, 
            volume: live.volume,
            avgVolume: live.avgVolume,
            fetchError: false 
          } : (live?.error ? { ...s, fetchError: true } : s);
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
      await fetchHoldings();
      await fetchInterests();
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
    return { profit, rate, isPositive: parseFloat(rate) >= 0 };
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
      if (data) { fetchHoldings().then(() => fetchAllPrices()); setIsAddModalOpen(false); }
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

  const isTargetReached = (stock: Stock) => stock.currentPrice !== null && stock.target > 0 && stock.currentPrice >= stock.target;
  const isSupplySpike = (stock: Stock | InterestStock) => {
    const change = 'changePercent' in stock ? stock.changePercent : (stock as InterestStock).change;
    const isPriceSpike = change !== undefined && change !== null && change >= 5;
    const isVolumeSpike = stock.volume !== undefined && stock.avgVolume !== undefined && stock.volume > 0 && stock.avgVolume > 0 && stock.volume >= stock.avgVolume * 2;
    return isPriceSpike || isVolumeSpike;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-32 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">AI STOCK</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">실시간 타이밍 감시 중</span>
              {lastSyncTime && <span className="text-[11px] text-blue-600 font-black">{lastSyncTime}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { fetchAllPrices(); fetchMarketIndices(); }} disabled={isRefreshing} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all shadow-sm active:scale-95"><RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} /></button>
            <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 active:scale-95"><Plus size={22} /></button>
          </div>
        </div>

        {/* Market Indices */}
        <div className="flex gap-3">
          {isMarketLoading ? (
            <><div className="flex-1 h-20 bg-gray-100 rounded-2xl animate-pulse"></div><div className="flex-1 h-20 bg-gray-100 rounded-2xl animate-pulse"></div></>
          ) : (
            marketIndices.map(market => {
              const isUp = market.changePercent >= 0;
              const displayPrice = market.price > 0 ? market.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '--';
              const displayChange = market.price > 0 ? `${isUp ? '+' : ''}${market.changePercent.toFixed(2)}%` : '--';
              return (
                <div key={market.symbol} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-tighter whitespace-nowrap">{market.name}</span>
                    {market.price > 0 && (isUp ? <ArrowUpRight size={14} className="text-red-500" /> : <ArrowDownRight size={14} className="text-blue-600" />)}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold tracking-tight">{displayPrice}</span>
                    <span className={`text-[11px] font-bold ${isUp ? 'text-red-500' : 'text-blue-600'}`}>{displayChange}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="px-6 py-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-blue-200/50 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest mb-1 opacity-80">My Total Assets</p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">{totalCurrentAmount.toLocaleString()}원</h2>
            <div className="flex gap-6 items-end">
              <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl flex items-center gap-1.5 font-bold text-xs border border-white/20">
                {isTotalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
                {totalBuyAmount > 0 ? (totalProfit/totalBuyAmount*100).toFixed(2) : '0.00'}%
              </div>
              <div className="flex-1 flex justify-end gap-4 text-white/80">
                <div className="text-right"><p className="text-[10px] font-bold uppercase opacity-60">Profit</p><p className="text-sm font-bold">{isTotalPositive ? '+' : ''}{totalProfit.toLocaleString()}</p></div>
                <div className="text-right"><p className="text-[10px] font-bold uppercase opacity-60">Stocks</p><p className="text-sm font-bold">{stocks.length}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="px-6 space-y-10">
        {/* 1. Holdings Section */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">내 보유 종목</h3>
          </div>
          {isInitialLoading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : stocks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-[2rem] p-10 text-center shadow-sm"><h4 className="text-gray-400 font-bold mb-4">보유 종목이 없습니다.</h4><button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-md shadow-blue-100 active:scale-95 transition-all">첫 종목 추가하기</button></div>
          ) : (
            <div className="space-y-4">
              {stocks.map(stock => {
                const { profit, rate, isPositive } = calculateProfit(stock);
                const isExpanded = expandedStockId === stock.id;
                const targetReached = isTargetReached(stock);
                const supplySpike = isSupplySpike(stock);
                
                return (
                  <div key={stock.id} className="bg-white border border-gray-200 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                    {targetReached && (
                      <div className="absolute top-4 right-4 animate-bounce">
                        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-red-400">
                          <Trophy size={12} /> 목표가 달성!
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-lg font-bold text-gray-800">{stock.name}</h4>
                          {supplySpike && <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse"><Flame size={12} /> 수급포착</div>}
                        </div>
                        <span className="text-[11px] text-gray-400 font-bold tracking-tight uppercase">{stock.symbol}</span>
                      </div>
                      <div className={`text-right ${targetReached ? 'mt-7' : ''}`}>
                        {stock.currentPrice === null ? <div className="w-20 h-6 bg-gray-50 animate-pulse rounded-lg"></div> : (
                          <><div className={`text-xl font-bold ${isPositive ? 'text-red-500' : 'text-blue-600'}`}>{isPositive ? '+' : ''}{rate}%</div><p className="text-[11px] text-gray-400 font-bold">{profit.toLocaleString()}원</p></>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100"><span className="text-[10px] text-gray-400 block font-bold mb-0.5 uppercase">Avg Buy</span><span className="text-sm font-bold text-gray-700">{stock.avgPrice.toLocaleString()}</span></div>
                      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100"><span className="text-[10px] text-gray-400 block font-bold mb-0.5 uppercase">Live</span>{stock.currentPrice === null ? <span className="animate-pulse">...</span> : <span className={`text-sm font-bold ${isPositive ? 'text-red-500' : 'text-blue-600'}`}>{stock.currentPrice.toLocaleString()}</span>}</div>
                    </div>
                    <button onClick={() => analyzeStock(stock)} disabled={loadingAi[stock.id] || stock.currentPrice === null} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${isExpanded ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-100 active:scale-95'}`}>
                      {loadingAi[stock.id] ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Sparkles size={18} /><span>{isExpanded ? "분석 결과 접기" : "Gemini 포트폴리오 분석"}</span></>}
                    </button>
                    {isExpanded && stock.analysis && (
                      <div className="mt-4 p-5 bg-gray-50 rounded-3xl border border-blue-100 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">{stock.analysis.action}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Target: <span className="text-gray-700">{stock.analysis.targetPrice.toLocaleString()}</span></span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{stock.analysis.reason}</p>
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
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">관심 종목 분석</h3>
          </div>
          {isInterestsLoading && interestStocks.length === 0 ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : interestStocks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-[2rem] p-10 text-center shadow-sm"><p className="text-gray-400 font-bold">등록된 관심 종목이 없습니다.</p></div>
          ) : (
            <div className="space-y-4">
              {interestStocks.map(stock => {
                const isExpanded = expandedInterestId === stock.id;
                const isUp = stock.change !== null && stock.change >= 0;
                const supplySpike = isSupplySpike(stock);
                
                return (
                  <div key={stock.id} className="bg-white border border-gray-200 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-600">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-lg font-bold text-gray-800">{stock.name}</h4>
                          {supplySpike && <Flame size={18} className="text-orange-500 animate-pulse" />}
                        </div>
                        <span className="text-[11px] text-gray-400 font-bold tracking-tight uppercase">{stock.symbol}</span>
                      </div>
                      <div className="text-right">
                        {stock.price === null ? <div className="w-20 h-6 bg-gray-50 animate-pulse rounded-lg"></div> : (
                          <><div className={`text-xl font-bold ${isUp ? 'text-red-500' : 'text-blue-600'}`}>{stock.price.toLocaleString()}</div><p className={`text-[11px] font-bold ${isUp ? 'text-red-500/70' : 'text-blue-600/70'}`}>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</p></>
                        )}
                      </div>
                    </div>
                    <button onClick={() => analyzeInterest(stock)} disabled={loadingInterestAi[stock.id] || stock.price === null} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${isExpanded ? 'bg-gray-100 text-gray-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-100 active:scale-95'}`}>
                      {loadingInterestAi[stock.id] ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Sparkles size={18} /><span>{isExpanded ? "분결 닫기" : "AI 매수 타이밍 분석"}</span></>}
                    </button>
                    {isExpanded && stock.analysis && (
                      <div className="mt-4 p-5 bg-gray-50 rounded-3xl border border-indigo-100 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-bold ${stock.analysis.action === '매수권장' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>{stock.analysis.action}</span>
                          <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Entry: {stock.analysis.targetPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{stock.analysis.reason}</p>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 italic tracking-tight uppercase">종목 추가</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">종목 코드 (Ticker)</label><input type="text" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" placeholder="005930.KS" /></div>
              <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">종목명</label><input type="text" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" placeholder="삼성전자" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">매수 단가</label><input type="number" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" /></div>
                <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">보유 수량</label><input type="number" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">목표가</label><input type="number" value={newStock.target || ''} onChange={e => setNewStock({...newStock, target: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" /></div>
                <div className="space-y-1.5"><label className="text-[11px] text-gray-400 font-bold uppercase tracking-widest ml-1">손절가</label><input type="number" value={newStock.stopLoss || ''} onChange={e => setNewStock({...newStock, stopLoss: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-blue-500" /></div>
              </div>
              <button onClick={handleAddStock} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4">포트폴리오에 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
