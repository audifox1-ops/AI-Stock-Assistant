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
    <div className="min-h-screen bg-white text-[#191f28] pb-40 animate-in fade-in duration-500">
      {/* Header / Market Indices */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-black tracking-tight text-[#3182f6]">AI Stock</h1>
          <div className="flex gap-5">
            <button onClick={() => { fetchMarketIndices(); fetchPrices(stocks, interestStocks); }} className="p-2 -m-2 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCcw size={22} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="p-2 -m-2 text-[#3182f6] hover:scale-110 transition-transform">
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex gap-8 items-center overflow-x-auto no-scrollbar py-3">
          {isMarketLoading ? (
            <><SkeletonText width="w-28" /><SkeletonText width="w-28" /></>
          ) : (
            marketIndices.map(market => (
              <div key={market.symbol} className="flex items-center gap-2 whitespace-nowrap overflow-visible">
                <span className="text-sm font-bold text-gray-400">{market.name}</span>
                <span className={`text-base font-black \${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {market.price > 0 ? market.price.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 \${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                  {market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                  {market.isFallback && <AlertCircle size={10} />}
                </span>
              </div>
            ))
          )}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-6 py-10">
        <p className="text-sm font-bold text-gray-400 mb-2">총 자산 현황</p>
        <div className="flex flex-wrap items-baseline gap-3">
          {isRefreshing && stocks.length === 0 ? <SkeletonText width="w-56" height="h-10" /> : <h2 className="text-4xl font-black tracking-tight">{totalCurrentAmount.toLocaleString()}원</h2>}
          <div className={`px-3 py-1 rounded-full text-xs font-black \${parseFloat(totalRate) >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </div>
        </div>
      </section>

      <div className="h-3 bg-gray-50"></div>

      {/* Holdings Section */}
      <section className="px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black">보유 주식</h3>
          <span className="text-[11px] font-black text-[#3182f6] px-3 py-1 bg-blue-50 rounded-full">리밸런싱 AI</span>
        </div>
        
        {isInitialLoading ? (
          <div className="space-y-10">
            {[1,2,3].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <SkeletonCircle />
                  <div className="space-y-2"><SkeletonText width="w-28" /><SkeletonText width="w-20" height="h-3" /></div>
                </div>
                <div className="text-right space-y-2"><SkeletonText width="w-24" /><SkeletonText width="w-16" height="h-3" /></div>
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="py-16 bg-gray-50 rounded-[3rem] text-center border-2 border-dashed border-gray-100 px-6">
            <p className="text-gray-400 font-bold mb-6">보유 종목을 추가하고{"\n"}전략을 확인해 보세요</p>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#3182f6] text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">첫 종목 추가</button>
          </div>
        ) : (
          <div className="space-y-10">
            {stocks.map(stock => {
              const isExpanded = expandedStockId === stock.id;
              const isProfit = (stock.currentPrice || stock.avgPrice) >= stock.avgPrice;
              const rate = (( (stock.currentPrice || stock.avgPrice) / stock.avgPrice - 1) * 100).toFixed(1);
              
              return (
                <div key={stock.id} className="overflow-visible">
                  <div className="flex justify-between items-center active:bg-gray-50 p-2 -m-2 rounded-3xl transition-colors cursor-pointer" onClick={() => analyzeStockOrInterest(stock, true)}>
                    <div className="flex items-center gap-5 overflow-visible">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-sm \${isProfit ? 'bg-red-400 shadow-red-50' : 'bg-blue-400 shadow-blue-50'} shadow-lg`}>
                        {stock.name.charAt(0)}
                      </div>
                      <div className="overflow-visible">
                        <h4 className="text-lg font-black text-[#191f28] leading-tight mb-1">{stock.name}</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{stock.symbol} · {stock.quantity}주</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4 overflow-visible">
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        {stock.isFallback && <AlertCircle size={14} className="text-orange-400" />}
                        <p className="text-lg font-black leading-none">
                          {isRefreshing && stock.currentPrice === null ? <SkeletonText className="inline-block" width="w-24" /> : (stock.currentPrice?.toLocaleString() || '--')}원
                        </p>
                      </div>
                      <p className={`text-sm font-black \${isProfit ? 'text-red-500' : 'text-blue-600'}`}>
                        {isProfit ? '+' : ''}{rate}%
                        {stock.isFallback && <span className="ml-2 text-[10px] opacity-70 font-bold">(직전가)</span>}
                      </p>
                    </div>
                  </div>

                  {/* AI Info Card */}
                  {(isExpanded || loadingAi[stock.id]) && (
                    <div className="mt-6 mx-2 bg-gray-50 rounded-[2rem] p-6 border border-gray-100 animate-in slide-in-from-top-3 duration-300 shadow-sm overflow-visible">
                      {loadingAi[stock.id] ? (
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 border-3 border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-black text-[#3182f6]">Gemini AI가 전략 수립 중...</p>
                        </div>
                      ) : stock.analysis ? (
                        <div className="space-y-5">
                          <div className="flex justify-between items-center gap-4 flex-wrap">
                            <div className={`px-5 py-2 rounded-full text-xs font-black border w-fit \${getActionColor(stock.analysis.action)} shadow-sm`}>
                              {stock.analysis.action}
                            </div>
                            <div className="text-right ml-auto">
                              <span className="text-[10px] font-black text-gray-400 block uppercase mb-0.5">최종 목표가</span>
                              <span className="text-base font-black text-[#191f28]">{stock.analysis.targetPrice.toLocaleString()}원</span>
                            </div>
                          </div>
                          <div className="h-px bg-gray-200/50 w-full"></div>
                          <p className="text-sm text-gray-600 leading-relaxed font-bold break-words whitespace-normal">
                            {stock.analysis.reason}
                          </p>
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
      <section className="px-6 py-10">
        <h3 className="text-xl font-black mb-8">관심있는 종목</h3>
        <div className="space-y-8">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            const isExpanded = expandedInterestId === stock.id;
            
            return (
              <div key={stock.id} className="overflow-visible">
                <div className="flex justify-between items-center active:bg-gray-50 p-3 -m-3 rounded-3xl transition-colors cursor-pointer" onClick={() => analyzeStockOrInterest(stock, false)}>
                  <div className="flex items-center gap-5 overflow-visible">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shadow-inner">
                      <Bell size={22} />
                    </div>
                    <div className="overflow-visible">
                      <h4 className="text-base font-black leading-tight mb-1">{stock.name}</h4>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stock.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4 overflow-visible">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      {stock.isFallback && <AlertCircle size={14} className="text-orange-400" />}
                      <p className="text-base font-black text-gray-800">{stock.price?.toLocaleString() || '--'}원</p>
                    </div>
                    <p className={`text-xs font-black \${isUp ? 'text-red-500' : 'text-blue-600'}`}>
                      {isUp ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                      {stock.isFallback && <span className="ml-2 text-[10px] opacity-70 font-bold">(직전가)</span>}
                    </p>
                  </div>
                </div>

                {/* AI Interest Card */}
                {(isExpanded || loadingAi[stock.id]) && (
                  <div className="mt-6 mx-2 bg-gray-100/50 rounded-[2rem] p-6 border border-gray-100 animate-in slide-in-from-top-3 duration-300 overflow-visible">
                    {loadingAi[stock.id] ? <SkeletonText width="w-full" height="h-20" /> : stock.analysis ? (
                      <div className="space-y-4">
                        <div className={`px-5 py-2 rounded-full text-xs font-black border w-fit shadow-sm \${getActionColor(stock.analysis.action)}`}>
                          {stock.analysis.action}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed font-bold break-words whitespace-normal">{stock.analysis.reason}</p>
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
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 p-8 pt-20 flex flex-col">
          <div className="flex justify-between items-start mb-12">
            <h2 className="text-3xl font-black leading-tight">내 자산에{"\n"}종목을 담아보세요</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={24} strokeWidth={3} /></button>
          </div>
          
          <div className="space-y-10 flex-1 overflow-y-auto no-scrollbar pb-10">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">종목 코드 또는 이름</label>
              <input type="text" className="w-full border-b-[3px] border-gray-100 py-4 text-xl font-black focus:border-[#3182f6] outline-none transition-colors placeholder:text-gray-200" placeholder="예: 삼성전자 또는 005930" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">종목 표시명</label>
              <input type="text" className="w-full border-b-[3px] border-gray-100 py-4 text-xl font-black focus:border-[#3182f6] outline-none transition-colors" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">평균 매수단가</label><input type="number" className="w-full border-b-[3px] border-gray-100 py-2 text-lg font-black focus:border-[#3182f6] outline-none transition-colors" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} /></div>
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">보유 수량</label><input type="number" className="w-full border-b-[3px] border-gray-100 py-2 text-lg font-black focus:border-[#3182f6] outline-none transition-colors" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">투자 목표가</label><input type="number" className="w-full border-b-[3px] border-gray-100 py-2 text-lg font-black focus:border-[#3182f6] outline-none transition-colors" value={newStock.target || ''} onChange={e => setNewStock({...newStock, target: Number(e.target.value)})} /></div>
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">리스크 관리(손절)</label><input type="number" className="w-full border-b-[3px] border-gray-100 py-2 text-lg font-black focus:border-[#3182f6] outline-none transition-colors" value={newStock.stopLoss || ''} onChange={e => setNewStock({...newStock, stopLoss: Number(e.target.value)})} /></div>
            </div>
          </div>
          
          <button onClick={handleAddStock} className="w-full py-6 bg-[#3182f6] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-100 mb-6 active:scale-95 transition-all mt-6">포트폴리오에 추가하기</button>
        </div>
      )}
    </div>
  );
}
