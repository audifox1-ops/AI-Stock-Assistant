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
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- Interfaces ---
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
  type: string;
  target: number;
  stopLoss: number;
  analysis?: AiAnalysisResult;
  error?: string;
  changePercent?: number;
  fetchError?: boolean;
  isFallback?: boolean;
}

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  fetchError?: boolean;
  isFallback?: boolean;
  analysis?: AiAnalysisResult;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  success: boolean;
  isFallback?: boolean;
}

// --- Skeleton UI Components ---
const SkeletonText = ({ width = "w-20", height = "h-4", className = "" }) => (
  <div className={`\${width} \${height} bg-gray-100 rounded-lg animate-pulse \${className}`}></div>
);

const SkeletonCircle = ({ size = "w-12 h-12" }) => (
  <div className={`\${size} bg-gray-100 rounded-2xl animate-pulse`}></div>
);

// --- Main Page ---
export default function PortfolioPage() {
  // State
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedStockId, setExpandedStockId] = useState<string | number | null>(null);
  const [expandedInterestId, setExpandedInterestId] = useState<string | number | null>(null);
  const [loadingAi, setLoadingAi] = useState<Record<string | number, boolean>>({});

  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  // Data Fetching
  const fetchMarketIndices = async () => {
    setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error(error); }
    finally { setIsMarketLoading(false); }
  };

  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: Stock[] = data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity),
          type: item.position_type as string, target: Number(item.target_price), stopLoss: Number(item.stop_loss),
        }));
        setStocks(mapped);
        return mapped;
      }
    } catch (err) { console.error(err); }
    return [];
  };

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: InterestStock[] = data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null, alertEnabled: item.alert_enabled,
        }));
        setInterestStocks(mapped);
        return mapped;
      }
    } catch (err) { console.error(err); }
    return [];
  };

  const fetchPrices = async (targetStocks: Stock[], targetInterests: InterestStock[]) => {
    if (targetStocks.length === 0 && targetInterests.length === 0) return;
    setIsRefreshing(true);
    try {
      const symbols = Array.from(new Set([
        ...targetStocks.map(s => s.symbol),
        ...targetInterests.map(s => s.symbol)
      ])).filter(Boolean);

      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      const data = await res.json();
      
      setStocks(prev => prev.map(s => {
        const live = data[s.symbol];
        if (live) {
          return { 
            ...s, 
            currentPrice: live.price, 
            changePercent: live.changePercent, 
            fetchError: live.fetchError,
            isFallback: live.isFallback 
          };
        }
        return s;
      }));

      setInterestStocks(prev => prev.map(s => {
        const live = data[s.symbol];
        if (live) {
          return { 
            ...s, 
            price: live.price, 
            change: live.changePercent, 
            fetchError: live.fetchError,
            isFallback: live.isFallback 
          };
        }
        return s;
      }));
    } catch (error) { console.error(error); }
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    const init = async () => {
      setIsInitialLoading(true);
      fetchMarketIndices();
      const [h, i] = await Promise.all([fetchHoldings(), fetchInterests()]);
      await fetchPrices(h, i);
      setIsInitialLoading(false);
    };
    init();
  }, []);

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) { alert('필수 정보를 모두 입력해 주세요.'); return; }
    try {
      const { data, error } = await supabase.from('holdings').insert([{
        symbol: newStock.symbol.toUpperCase(), stock_name: newStock.name, avg_buy_price: Number(newStock.avgPrice),
        quantity: Number(newStock.quantity), position_type: newStock.type,
        target_price: Number(newStock.target), stop_loss: Number(newStock.stopLoss)
      }]).select();
      if (error) throw error;
      if (data) { 
        const updated = await fetchHoldings();
        fetchPrices(updated, interestStocks);
        setIsAddModalOpen(false); 
      }
    } catch (err) { console.error('Error adding stock:', err); }
  };

  const analyzeStockOrInterest = async (item: Stock | InterestStock, isHolding: boolean) => {
    const id = item.id;
    const isExpanded = isHolding ? expandedStockId === id : expandedInterestId === id;
    
    if (isExpanded) {
      if (isHolding) setExpandedStockId(null);
      else setExpandedInterestId(null);
      return;
    }

    if (item.analysis) {
      if (isHolding) setExpandedStockId(id);
      else setExpandedInterestId(id);
      return;
    }

    setLoadingAi(prev => ({ ...prev, [id]: true }));
    try {
      const price = isHolding ? (item as Stock).currentPrice : (item as InterestStock).price;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: item.name, 
          currentPrice: price,
          type: isHolding ? 'holding' : 'interest',
          rate: isHolding ? (((price! / (item as Stock).avgPrice) - 1) * 100).toFixed(2) : undefined
        })
      });
      const data = await res.json();
      if (isHolding) {
        setStocks(prev => prev.map(s => s.id === id ? { ...s, analysis: data } : s));
        setExpandedStockId(id);
      } else {
        setInterestStocks(prev => prev.map(s => s.id === id ? { ...s, analysis: data } : s));
        setExpandedInterestId(id);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingAi(prev => ({ ...prev, [id]: false })); }
  };

  const getActionColor = (action: string) => {
    if (action.includes('매수')) return 'bg-red-50 text-red-600 border-red-100';
    if (action.includes('홀딩')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (action.includes('매도')) return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-gray-50 text-gray-500 border-gray-100';
  };

  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-32 animate-in fade-in duration-500">
      {/* Header / Market Indices */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold tracking-tight text-[#3182f6]">AI Stock</h1>
          <div className="flex gap-4">
            <button onClick={() => { fetchMarketIndices(); fetchPrices(stocks, interestStocks); }} className="text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="text-[#3182f6] hover:scale-110 transition-transform">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex gap-6 items-center overflow-x-auto no-scrollbar py-2">
          {isMarketLoading ? (
            <><SkeletonText width="w-24" /><SkeletonText width="w-24" /></>
          ) : (
            marketIndices.map(market => (
              <div key={market.symbol} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-sm font-bold text-gray-400">{market.name}</span>
                <span className={`text-sm font-bold \${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {market.price > 0 ? market.price.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
                </span>
                <span className={`text-[11px] font-bold px-1 rounded flex items-center gap-0.5 \${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                  {market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                  {market.isFallback && <AlertCircle size={10} />}
                </span>
              </div>
            ))
          )}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-6 py-8">
        <p className="text-sm font-bold text-gray-400 mb-1">총 자산 현황</p>
        <div className="flex items-baseline gap-2">
          {isRefreshing && stocks.length === 0 ? <SkeletonText width="w-40" height="h-8" /> : <h2 className="text-3xl font-bold tracking-tight">{totalCurrentAmount.toLocaleString()}원</h2>}
          <span className={`text-sm font-bold \${parseFloat(totalRate) >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </span>
        </div>
      </section>

      <div className="h-2 bg-gray-50"></div>

      {/* Holdings Section */}
      <section className="px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">보유 주식</h3>
          <span className="text-xs font-bold text-[#3182f6] px-2 py-1 rounded-lg">리밸런싱 AI</span>
        </div>
        
        {isInitialLoading ? (
          <div className="space-y-8">
            {[1,2,3].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <SkeletonCircle />
                  <div className="space-y-1.5"><SkeletonText width="w-24" /><SkeletonText width="w-16" height="h-3" /></div>
                </div>
                <div className="text-right space-y-1.5"><SkeletonText width="w-20" /><SkeletonText width="w-12" height="h-3" /></div>
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="py-12 bg-gray-50 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold mb-4">보유 종목을 추가해 보세요</p>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#3182f6] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95">추가하기</button>
          </div>
        ) : (
          <div className="space-y-8">
            {stocks.map(stock => {
              const isExpanded = expandedStockId === stock.id;
              const isProfit = (stock.currentPrice || stock.avgPrice) >= stock.avgPrice;
              const rate = (( (stock.currentPrice || stock.avgPrice) / stock.avgPrice - 1) * 100).toFixed(1);
              
              return (
                <div key={stock.id}>
                  <div className="flex justify-between items-center active:bg-gray-50 p-2 -m-2 rounded-2xl transition-colors cursor-pointer" onClick={() => analyzeStockOrInterest(stock, true)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xs \${isProfit ? 'bg-red-400' : 'bg-blue-400'} shadow-lg shadow-gray-100`}>
                        {stock.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#191f28]">{stock.name}</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{stock.symbol} · {stock.quantity}주</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {stock.isFallback && <AlertCircle size={12} className="text-orange-400" />}
                        <p className="text-base font-bold leading-none">
                          {isRefreshing && stock.currentPrice === null ? <SkeletonText className="inline-block" /> : (stock.currentPrice?.toLocaleString() || '--')}
                        </p>
                      </div>
                      <p className={`text-xs font-bold \${isProfit ? 'text-red-500' : 'text-blue-600'}`}>
                        {isProfit ? '+' : ''}{rate}%
                        {stock.isFallback && <span className="ml-1 text-[10px] opacity-70">(직전가)</span>}
                      </p>
                    </div>
                  </div>

                  {/* AI Info Card */}
                  {(isExpanded || loadingAi[stock.id]) && (
                    <div className="mt-4 bg-gray-50 rounded-3xl p-5 border border-gray-100 animate-in slide-in-from-top-2">
                      {loadingAi[stock.id] ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-bold text-[#3182f6]">AI가 전략을 분석 중입니다...</p>
                        </div>
                      ) : stock.analysis ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-black border \${getActionColor(stock.analysis.action)}`}>
                              {stock.analysis.action}
                            </div>
                            <div className="text-right"><span className="text-[10px] font-bold text-gray-400 block uppercase">목표가</span><span className="text-sm font-black text-[#191f28]">{stock.analysis.targetPrice.toLocaleString()}원</span></div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed font-medium">{stock.analysis.reason}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-2 bg-gray-50"></div>

      {/* Interests Section */}
      <section className="px-6 py-8">
        <h3 className="text-lg font-bold mb-6">관심 종목</h3>
        <div className="space-y-6">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            const isExpanded = expandedInterestId === stock.id;
            
            return (
              <div key={stock.id}>
                <div className="flex justify-between items-center active:bg-gray-50 p-2 -m-2 rounded-2xl transition-colors cursor-pointer" onClick={() => analyzeStockOrInterest(stock, false)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">{stock.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stock.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {stock.isFallback && <AlertCircle size={12} className="text-orange-400" />}
                      <p className="text-sm font-bold text-gray-800">{stock.price?.toLocaleString() || '--'}</p>
                    </div>
                    <p className={`text-[11px] font-bold \${isUp ? 'text-red-500' : 'text-blue-600'}`}>
                      {isUp ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                      {stock.isFallback && <span className="ml-1 text-[9px] opacity-70">(직전가)</span>}
                    </p>
                  </div>
                </div>

                {/* AI Interest Card */}
                {(isExpanded || loadingAi[stock.id]) && (
                  <div className="mt-4 bg-gray-50 rounded-3xl p-5 border border-gray-100 animate-in slide-in-from-top-2">
                    {loadingAi[stock.id] ? <SkeletonText width="w-full" height="h-16" /> : stock.analysis ? (
                      <div className="space-y-3">
                        <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border \${getActionColor(stock.analysis.action)}`}>{stock.analysis.action}</div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{stock.analysis.reason}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 p-6 pt-16 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-bold leading-snug">어떤 종목을{"\n"}포트폴리오에 담을까요?</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><X size={20} /></button>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">종목 코드 또는 이름</label>
              <input type="text" className="w-full border-b-2 border-gray-100 py-3 text-lg font-bold focus:border-[#3182f6] outline-none transition-colors" placeholder="예: 삼성전자 또는 005930" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">종목명</label>
              <input type="text" className="w-full border-b-2 border-gray-100 py-3 text-lg font-bold focus:border-[#3182f6] outline-none" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-400 ml-1">매수단가</label><input type="number" className="w-full border-b-2 border-gray-100 py-2 text-base font-bold focus:border-[#3182f6] outline-none" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-400 ml-1">수량</label><input type="number" className="w-full border-b-2 border-gray-100 py-2 text-base font-bold focus:border-[#3182f6] outline-none" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-400 ml-1">목표가</label><input type="number" className="w-full border-b-2 border-gray-100 py-2 text-base font-bold focus:border-[#3182f6] outline-none" value={newStock.target || ''} onChange={e => setNewStock({...newStock, target: Number(e.target.value)})} /></div>
              <div className="space-y-1.5"><label className="text-[11px] font-bold text-gray-400 ml-1">손절가</label><input type="number" className="w-full border-b-2 border-gray-100 py-2 text-base font-bold focus:border-[#3182f6] outline-none" value={newStock.stopLoss || ''} onChange={e => setNewStock({...newStock, stopLoss: Number(e.target.value)})} /></div>
            </div>
          </div>
          
          <button onClick={handleAddStock} className="w-full py-5 bg-[#3182f6] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 mb-8 active:scale-95 transition-all">등록하기</button>
        </div>
      )}
    </div>
  );
}
