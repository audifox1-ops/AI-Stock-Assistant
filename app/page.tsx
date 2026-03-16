"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, RefreshCcw, Bell, Trash2 } from 'lucide-react';
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
  updatedAt?: string;
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
  updatedAt?: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  success: boolean;
  isFallback?: boolean;
  status?: string;
  updatedAt?: string;
}

// --- Skeleton UI Components ---
const SkeletonText = ({ width = "w-32", height = "h-4", className = "" }) => (
  <div className={` ${width} ${height} bg-gray-100 rounded-lg animate-pulse ${className}`}></div>
);

const SkeletonCircle = ({ size = "w-16 h-16" }) => (
  <div className={` ${size} bg-gray-100 rounded-2xl animate-pulse`}></div>
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
  const fetchMarketIndices = async (silent = false) => {
    if (!silent) setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error("[Front] Market API Error:", error); }
    finally { if (!silent) setIsMarketLoading(false); }
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

  const fetchPrices = async (targetStocks: Stock[], targetInterests: InterestStock[], silent = false) => {
    if (targetStocks.length === 0 && targetInterests.length === 0) return;
    if (!silent) setIsRefreshing(true);
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
        if (live) return { ...s, currentPrice: live.price, changePercent: live.changePercent, isFallback: live.isFallback, status: live.status, updatedAt: live.updatedAt };
        return s;
      }));

      setInterestStocks(prev => prev.map(s => {
        const live = data[s.symbol];
        if (live) return { ...s, price: live.price, change: live.changePercent, isFallback: live.isFallback, status: live.status, updatedAt: live.updatedAt };
        return s;
      }));
    } catch (error) { console.error("[Front] Price Fetch Error:", error); }
    finally { if (!silent) setIsRefreshing(false); }
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

    const pollInterval = setInterval(() => {
      fetchMarketIndices(true);
      setStocks(currentStocks => {
        setInterestStocks(currentInterests => {
          fetchPrices(currentStocks, currentInterests, true);
          return currentInterests;
        });
        return currentStocks;
      });
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) { alert('필수 입력!'); return; }
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
    } catch (err) { console.error(err); }
  };

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제할까요?')) return;
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
      setInterestStocks(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const toggleInterestAlert = async (id: string | number, current: boolean) => {
    try {
      const { error } = await supabase.from('alerts').update({ alert_enabled: !current }).eq('id', id);
      if (error) throw error;
      setInterestStocks(prev => prev.map(s => s.id === id ? { ...s, alertEnabled: !current } : s));
    } catch (err) { console.error(err); }
  };

  const analyzeStockOrInterest = async (item: Stock | InterestStock, isHolding: boolean) => {
    const id = item.id;
    const isExpanded = isHolding ? expandedStockId === id : expandedInterestId === id;
    if (isExpanded) { if (isHolding) setExpandedStockId(null); else setExpandedInterestId(null); return; }
    if (item.analysis) { if (isHolding) setExpandedStockId(id); else setExpandedInterestId(id); return; }

    setLoadingAi(prev => ({ ...prev, [id]: true }));
    try {
      const price = isHolding ? (item as Stock).currentPrice : (item as InterestStock).price;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: item.name, currentPrice: price, type: isHolding ? 'holding' : 'interest',
          rate: isHolding ? (((price! / (item as Stock).avgPrice) - 1) * 100).toFixed(2) : undefined
        }),
      });
      const data = await res.json();
      if (isHolding) { setStocks(prev => prev.map(s => s.id === id ? { ...s, analysis: data } : s)); setExpandedStockId(id); }
      else { setInterestStocks(prev => prev.map(s => s.id === id ? { ...s, analysis: data } : s)); setExpandedInterestId(id); }
    } catch (err) { console.error(err); }
    finally { setLoadingAi(prev => ({ ...prev, [id]: false })); }
  };

  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50/30 text-[#191f28] pb-44 animate-in fade-in duration-500 overflow-x-hidden overflow-y-visible">
      {/* Header */}
      <header className="w-full px-8 pt-14 pb-8 overflow-hidden box-border bg-white border-b border-gray-100">
        <div className="flex justify-between items-center mb-12 overflow-visible">
          <h1 className="text-3xl font-black tracking-tight text-[#3182f6]">AI Stock</h1>
          <div className="flex gap-6 overflow-visible">
            <button onClick={() => { fetchMarketIndices(); fetchPrices(stocks, interestStocks); }} className="p-4 text-gray-400 bg-gray-50 rounded-full shadow-sm">
              <RefreshCcw size={24} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="p-4 text-[#3182f6] bg-blue-50 rounded-full shadow-sm">
              <Plus size={30} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex gap-10 items-center overflow-x-auto no-scrollbar py-4 w-full">
          {isMarketLoading ? <SkeletonText width="w-40" /> : marketIndices.map(market => (
            <div key={market.symbol} className="flex flex-col gap-1 min-w-fit">
              <div className="flex items-center gap-4 whitespace-nowrap">
                <span className="text-sm font-black text-gray-400">{market.name}</span>
                <span className={`text-lg font-black ${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {market.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
                <span className={`text-xs font-black px-10 py-3 rounded-full ${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                  {market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold ml-1">({market.updatedAt || '--:--:--'} 기준)</p>
            </div>
          ))}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-8 py-12 overflow-visible bg-white">
        <p className="text-sm font-black text-gray-400 mb-3 tracking-wider uppercase">Portfolio Balance</p>
        <div className="flex flex-wrap items-center gap-6 overflow-visible">
          <h2 className="text-5xl font-black tracking-tight leading-none overflow-visible">{totalCurrentAmount.toLocaleString()}원</h2>
          <div className={`px-10 py-3 rounded-full text-sm font-black min-w-max shadow-sm border ${parseFloat(totalRate) >= 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </div>
        </div>
      </section>

      {/* Holdings Section */}
      <section className="px-8 py-12 overflow-visible mt-4">
        <h3 className="text-2xl font-black mb-12">나의 투자 현황</h3>
        
        {isInitialLoading ? <SkeletonCircle /> : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 gap-8 border-2 border-dashed border-gray-200 rounded-2xl w-full box-border bg-white">
            <p className="text-gray-500 text-center text-lg leading-relaxed">
              보유하신 종목을 한 번만 등록해 보세요.<br/>
              AI가 즉시 승률 높은 전략을 제안합니다.
            </p>
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="px-8 py-3 bg-blue-500 text-white font-bold rounded-full w-fit whitespace-nowrap shadow-md hover:bg-blue-600 transition-colors"
            >
              지금 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {stocks.map(stock => {
              const isProfit = (stock.currentPrice || stock.avgPrice) >= stock.avgPrice;
              const rate = (( (stock.currentPrice || stock.avgPrice) / stock.avgPrice - 1) * 100).toFixed(1);
              return (
                <div 
                  key={stock.id} 
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-200 transition-all"
                  onClick={() => analyzeStockOrInterest(stock, true)}
                >
                  <div className="flex items-center gap-8 min-w-0 flex-1">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white ${isProfit ? 'bg-red-400' : 'bg-blue-400'}`}>
                      {stock.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xl font-bold text-gray-900 leading-tight mb-1 truncate uppercase">{stock.name}</h4>
                      <p className="text-xs font-medium text-gray-400">
                        {stock.quantity.toLocaleString()}주 · {stock.updatedAt ? `${stock.updatedAt} 기준` : '업데이트 중'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-black text-gray-900 mb-1">{(stock.currentPrice?.toLocaleString() || '--')}원</p>
                    <div className={`px-6 py-1 rounded-full text-xs font-black inline-block ${isProfit ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                      {isProfit ? '+' : ''}{rate}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Interests Section - [지시사항] 모던 클린 카드형 UX 적용 */}
      <section className="px-8 py-12 overflow-visible bg-gray-50/50">
        <h3 className="text-2xl font-black mb-12">관심있는 종목</h3>
        <div className="space-y-4">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            return (
              <div 
                key={stock.id} 
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-row items-center justify-between transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                {/* [왼쪽 구역] 종목 정보 - 짤림 절대 불가 구조 */}
                <div className="flex flex-col min-w-0 flex-1" onClick={() => analyzeStockOrInterest(stock, false)}>
                  <h4 className="text-xl font-bold text-gray-900 mb-1 truncate uppercase">
                    {stock.name}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {stock.symbol}
                    </span>
                    {stock.updatedAt && (
                      <span className="text-[10px] font-bold text-gray-400">
                        {stock.updatedAt} 기준
                      </span>
                    )}
                  </div>
                </div>

                {/* [오른쪽 구역] 가격 및 액션 - 겹침 방지 */}
                <div className="flex flex-row items-center gap-6 flex-shrink-0 ml-4">
                  <div className="text-right" onClick={() => analyzeStockOrInterest(stock, false)}>
                    <p className="text-xl font-black text-gray-900 leading-tight">
                      {(stock.price?.toLocaleString() || '--')}원
                    </p>
                    <p className={`text-xs font-black mt-1 ${isUp ? 'text-red-500' : 'text-blue-600'}`}>
                      {isUp ? '▲' : '▼'}{Math.abs(stock.change || 0).toFixed(2)}%
                    </p>
                  </div>
                  
                  {/* 액션 버튼 그룹 */}
                  <div className="flex items-center gap-3 border-l border-gray-100 pl-6 ml-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleInterestAlert(stock.id, stock.alertEnabled); }}
                      className={`p-3 rounded-xl transition-all ${stock.alertEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-500 bg-gray-50'}`}
                    >
                      <Bell size={20} className={stock.alertEnabled ? 'animate-pulse' : ''} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeInterest(stock.id); }}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-10 pt-28 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-visible">
          <div className="flex justify-between items-start mb-20 overflow-visible">
            <h2 className="text-5xl font-black leading-[1.1]">자산 등록</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-5 bg-gray-100 rounded-full text-gray-400"><X size={32} /></button>
          </div>
          <div className="space-y-14 flex-1 overflow-y-auto no-scrollbar pb-10">
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">종목 코드 (6자리)</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none placeholder:text-gray-200 bg-transparent" placeholder="005930" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">관리용 명칭</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none placeholder:text-gray-200 bg-transparent" placeholder="삼성전자" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-12">
              <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none bg-transparent" placeholder="평단가" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} />
              <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none bg-transparent" placeholder="수량" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} />
            </div>
          </div>
          <button onClick={handleAddStock} className="w-full py-8 bg-[#3182f6] text-white rounded-[3rem] font-black text-3xl shadow-2xl active:scale-95 transition-all mb-14">연결하기</button>
        </div>
      )}
    </div>
  );
}
