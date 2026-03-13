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
  status?: string;
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
  status?: string;
  analysis?: AiAnalysisResult;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  success: boolean;
  isFallback?: boolean;
  status?: string;
}

// --- Skeleton UI Components ---
const SkeletonText = ({ width = "w-32", height = "h-4", className = "" }) => (
  <div className={`\${width} \${height} bg-gray-100 rounded-lg animate-pulse \${className}`}></div>
);

const SkeletonCircle = ({ size = "w-16 h-16" }) => (
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
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { 
      console.error("[Front] Market API Error:", error); 
    }
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
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
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
            isFallback: live.isFallback,
            status: live.status
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
            isFallback: live.isFallback,
            status: live.status
          };
        }
        return s;
      }));
    } catch (error) { console.error("[Front] Stock API Price Fetch Error:", error); }
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
        }),
        cache: 'no-store'
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
    <div className="min-h-screen bg-white text-[#191f28] pb-44 animate-in fade-in duration-500 overflow-x-hidden overflow-y-visible">
      {/* Header / Market Indices */}
      <header className="px-8 pt-14 pb-8 overflow-visible">
        <div className="flex justify-between items-center mb-12 overflow-visible">
          <h1 className="text-3xl font-black tracking-tight text-[#3182f6] min-w-fit px-1">AI Stock</h1>
          <div className="flex gap-6 overflow-visible">
            <button onClick={() => { fetchMarketIndices(); fetchPrices(stocks, interestStocks); }} className="p-4 -m-2 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-full shadow-sm">
              <RefreshCcw size={24} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="p-4 -m-2 text-[#3182f6] hover:scale-110 transition-transform bg-blue-50 rounded-full shadow-sm">
              <Plus size={30} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex gap-10 items-center overflow-x-auto no-scrollbar py-4 overflow-y-visible scroll-smooth">
          {isMarketLoading ? (
            <><SkeletonText width="w-40" /><SkeletonText width="w-40" /></>
          ) : (
            marketIndices.map(market => (
              <div key={market.symbol} className="flex items-center gap-4 whitespace-nowrap min-w-fit overflow-visible">
                <span className="text-sm font-black text-gray-400">{market.name}</span>
                <span className={`text-lg font-black \${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {market.price > 0 ? market.price.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
                </span>
                <span className={`text-xs font-black px-10 py-3 rounded-full flex items-center gap-2 \${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'} shadow-sm border border-transparent min-w-fit`}>
                  {market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                  <span className="text-[10px] opacity-70 ml-1">(\${market.status === '공공데이터' ? '실시간' : market.status})</span>
                </span>
              </div>
            ))
          )}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-8 py-12 overflow-visible">
        <p className="text-sm font-black text-gray-400 mb-3 ml-1 tracking-wider uppercase">Portfolio Balance</p>
        <div className="flex flex-wrap items-center gap-6 overflow-visible">
          {isRefreshing && stocks.length === 0 ? <SkeletonText width="w-72" height="h-14" /> : <h2 className="text-5xl font-black tracking-tight leading-none overflow-visible">{totalCurrentAmount.toLocaleString()}원</h2>}
          <div className={`px-10 py-3 rounded-full text-sm font-black min-w-fit shadow-sm border \${parseFloat(totalRate) >= 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'} overflow-visible`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </div>
        </div>
      </section>

      <div className="h-4 bg-gray-50/60"></div>

      {/* Holdings Section */}
      <section className="px-8 py-12 overflow-visible">
        <div className="flex justify-between items-center mb-12 overflow-visible">
          <h3 className="text-2xl font-black min-w-fit">나의 투자 현황</h3>
          <span className="text-xs font-black text-[#3182f6] px-8 py-3 bg-blue-50 rounded-full shadow-sm min-w-fit border border-blue-100/50">Gemini Strategy Analysis</span>
        </div>
        
        {isInitialLoading ? (
          <div className="space-y-12">
            {[1,2,3].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <SkeletonCircle />
                  <div className="space-y-3"><SkeletonText width="w-40" /><SkeletonText width="w-28" height="h-3" /></div>
                </div>
                <div className="text-right space-y-3"><SkeletonText width="w-32" /><SkeletonText width="w-24" height="h-3" /></div>
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="py-24 bg-gray-50/50 rounded-[4rem] text-center border-2 border-dashed border-gray-100 px-10">
            <p className="text-gray-400 font-black mb-10 leading-relaxed whitespace-pre-line text-base overflow-visible">보유하신 종목을 한 번만 등록해 보세요.{"\n"}AI가 즉시 승률 높은 전략을 제안합니다.</p>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#3182f6] text-white px-10 py-6 rounded-[2.5rem] font-black shadow-2xl shadow-blue-100 active:scale-95 transition-all text-xl min-w-fit">지금 시작하기</button>
          </div>
        ) : (
          <div className="space-y-14">
            {stocks.map(stock => {
              const isProfit = (stock.currentPrice || stock.avgPrice) >= stock.avgPrice;
              const rate = (( (stock.currentPrice || stock.avgPrice) / stock.avgPrice - 1) * 100).toFixed(1);
              const isExpanded = expandedStockId === stock.id;
              
              return (
                <div key={stock.id} className="overflow-visible">
                  <div className="flex justify-between items-center active:bg-gray-50/80 p-5 -m-5 rounded-[3rem] transition-all cursor-pointer overflow-visible group relative" onClick={() => analyzeStockOrInterest(stock, true)}>
                    <div className="flex items-center overflow-visible pl-14 min-w-fit">
                      {/* Fixed overlap: Absolute icon with pl-14 container */}
                      <div className={`absolute left-5 w-16 h-16 rounded-[1.75rem] flex items-center justify-center font-black text-white text-lg \${isProfit ? 'bg-red-400 shadow-red-100/50' : 'bg-blue-400 shadow-blue-100/50'} shadow-2xl transition-transform group-hover:scale-105 duration-500 z-10`}>
                        {stock.name.charAt(0)}
                      </div>
                      <div className="overflow-visible min-w-fit ml-6">
                        <h4 className="text-xl font-black text-[#191f28] leading-tight mb-2 min-w-fit break-keep whitespace-nowrap overflow-visible px-0.5">{stock.name}</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest overflow-visible whitespace-nowrap">
                          {stock.status === '공공데이터' ? '공공데이터 실시간' : stock.status || '대기'} · {stock.quantity.toLocaleString()}주
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-10 overflow-visible min-w-fit">
                      <div className="flex items-center justify-end gap-3 mb-2 overflow-visible">
                        {stock.isFallback && <AlertCircle size={18} className="text-orange-400 animate-pulse" />}
                        <p className="text-2xl font-black text-[#1b1c1e] tracking-tight whitespace-nowrap overflow-visible px-0.5">
                          {isRefreshing && stock.currentPrice === null ? <SkeletonText className="inline-block" width="w-32" /> : (stock.currentPrice?.toLocaleString() || '--')}원
                        </p>
                      </div>
                      <div className={`px-5 py-1.5 rounded-full text-xs font-black inline-flex items-center \${isProfit ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'} shadow-sm overflow-visible`}>
                        {isProfit ? '+' : ''}{rate}%
                        {stock.isFallback && <span className="ml-2 opacity-60 text-[10px] tracking-tighter">(직전가)</span>}
                      </div>
                    </div>
                  </div>

                  {/* AI Macro Info */}
                  {(isExpanded || loadingAi[stock.id]) && (
                    <div className="mt-10 mx-1 bg-white border border-gray-100 rounded-[3.5rem] p-10 animate-in slide-in-from-top-6 duration-700 shadow-[0_15px_40px_rgba(0,0,0,0.02)] overflow-visible">
                      {loadingAi[stock.id] ? (
                        <div className="flex items-center gap-6">
                          <div className="w-8 h-8 border-[4px] border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-lg font-black text-[#3182f6]">최신 수급 및 차트 정밀 분석 중...</p>
                        </div>
                      ) : stock.analysis ? (
                        <div className="space-y-8 overflow-visible">
                          <div className="flex justify-between items-center gap-10 flex-wrap overflow-visible">
                            <div className={`px-10 py-3.5 rounded-full text-base font-black border min-w-fit shadow-md \${getActionColor(stock.analysis.action)} overflow-visible`}>
                              {stock.analysis.action}
                            </div>
                            <div className="text-right ml-auto min-w-fit overflow-visible">
                              <span className="text-[12px] font-black text-gray-400 block uppercase mb-2 tracking-[0.2em] px-1">Gemini TP Goal</span>
                              <span className="text-2xl font-black text-[#191f28] overflow-visible">{stock.analysis.targetPrice.toLocaleString()}원</span>
                            </div>
                          </div>
                          <div className="h-[2px] bg-gray-100 rounded-full w-full"></div>
                          <p className="text-base text-gray-600 leading-relaxed font-bold break-keep whitespace-normal px-1 overflow-visible">
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

      <div className="h-4 bg-gray-50/60"></div>

      {/* Interests Section */}
      <section className="px-8 py-12 overflow-visible">
        <h3 className="text-2xl font-black mb-12 min-w-fit overflow-visible">관심있는 종목</h3>
        <div className="space-y-12 overflow-visible">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            const isExpanded = expandedInterestId === stock.id;
            
            return (
              <div key={stock.id} className="overflow-visible">
                <div className="flex justify-between items-center active:bg-gray-50/80 p-6 -m-6 rounded-[3.5rem] transition-all cursor-pointer overflow-visible group relative" onClick={() => analyzeStockOrInterest(stock, false)}>
                  <div className="flex items-center overflow-visible pl-14 min-w-fit">
                    <div className="absolute left-6 w-18 h-18 rounded-full bg-white flex items-center justify-center text-gray-300 shadow-xl border border-gray-100 flex-shrink-0 group-hover:scale-105 transition-transform duration-500 z-10">
                      <Bell size={30} strokeWidth={2.5} />
                    </div>
                    <div className="overflow-visible min-w-fit ml-8">
                      <h4 className="text-2xl font-black leading-tight mb-2 px-0.5 whitespace-nowrap overflow-visible">{stock.name}</h4>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em] overflow-visible">{stock.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-12 overflow-visible min-w-fit">
                    <div className="flex items-center justify-end gap-3 mb-2 overflow-visible">
                      {stock.isFallback && <AlertCircle size={20} className="text-orange-400" />}
                      <p className="text-2xl font-black text-[#191f28] tracking-tight whitespace-nowrap overflow-visible px-0.5">{stock.price?.toLocaleString() || '--'}원</p>
                    </div>
                    <div className={`px-6 py-2 rounded-full text-xs font-black inline-flex items-center shadow-sm border \${isUp ? 'text-red-500 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'} overflow-visible`}>
                      {isUp ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                      <span className="ml-2 text-[10px] opacity-70">(\${stock.status === '공공데이터' ? '실시간' : stock.status || '대기'})</span>
                    </div>
                  </div>
                </div>

                {/* AI Interest Card */}
                {(isExpanded || loadingAi[stock.id]) && (
                  <div className="mt-10 mx-1 bg-gray-50 border border-gray-100 rounded-[3.5rem] p-10 animate-in slide-in-from-top-6 duration-700 overflow-visible shadow-inner">
                    {loadingAi[stock.id] ? <SkeletonText width="w-full" height="h-28" /> : stock.analysis ? (
                      <div className="space-y-6 overflow-visible">
                        <div className={`px-10 py-3.5 rounded-full text-base font-black border min-w-fit shadow-md \${getActionColor(stock.analysis.action)} overflow-visible bg-white`}>
                          {stock.analysis.action}
                        </div>
                        <p className="text-base text-gray-700 leading-relaxed font-bold break-keep whitespace-normal px-1 overflow-visible">{stock.analysis.reason}</p>
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
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-700 p-10 pt-28 flex flex-col overflow-visible">
          <div className="flex justify-between items-start mb-20 overflow-visible">
            <h2 className="text-5xl font-black leading-[1.1] tracking-tight overflow-visible">당신의 자산에{"\n"}<span className="text-[#3182f6]">인공지능 가치</span> 추가</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-5 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all shadow-sm active:rotate-90"><X size={32} strokeWidth={3} /></button>
          </div>
          
          <div className="space-y-14 flex-1 overflow-y-auto no-scrollbar pb-16 overflow-x-visible">
            <div className="space-y-4 overflow-visible px-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 overflow-visible">종목 코드 (6자리) 또는 티커</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none transition-all placeholder:text-gray-200 bg-transparent rounded-none" placeholder="005930 또는 삼성전자" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} />
            </div>
            <div className="space-y-4 overflow-visible px-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-2 overflow-visible">앱 관리용 표시 명칭</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none transition-all placeholder:text-gray-200 bg-transparent rounded-none" placeholder="삼성전자 (보유)" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-12 px-2 overflow-visible">
              <div className="space-y-4 overflow-visible">
                <label className="text-xs font-black text-gray-400 ml-2 tracking-widest uppercase overflow-visible">Avg Buy Price</label>
                <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none transition-all bg-transparent rounded-none" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} />
              </div>
              <div className="space-y-4 overflow-visible">
                <label className="text-xs font-black text-gray-400 ml-2 tracking-widest uppercase overflow-visible">Owned Shares</label>
                <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none transition-all bg-transparent rounded-none" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} />
              </div>
            </div>
          </div>
          
          <button onClick={handleAddStock} className="w-full py-8 bg-[#3182f6] text-white rounded-[3rem] font-black text-3xl shadow-[0_25px_70px_-15px_rgba(49,130,246,0.35)] mb-14 active:scale-[0.97] transition-all mt-10 px-10">포트폴리오에 인텔리전스 연결</button>
        </div>
      )}
    </div>
  );
}
