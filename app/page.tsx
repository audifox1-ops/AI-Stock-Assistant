"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X,
  RefreshCcw,
  Bell,
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
  const fetchMarketIndices = async () => {
    setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error("[Front] Market API Error:", error); }
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
        if (live) return { ...s, currentPrice: live.price, changePercent: live.changePercent, isFallback: live.isFallback, status: live.status };
        return s;
      }));

      setInterestStocks(prev => prev.map(s => {
        const live = data[s.symbol];
        if (live) return { ...s, price: live.price, change: live.changePercent, isFallback: live.isFallback, status: live.status };
        return s;
      }));
    } catch (error) { console.error("[Front] Price Fetch Error:", error); }
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
    <div className="min-h-screen bg-white text-[#191f28] pb-44 animate-in fade-in duration-500 overflow-x-hidden overflow-y-visible">
      {/* Header */}
      <header className="px-8 pt-14 pb-8 overflow-visible">
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

        <div className="flex gap-10 items-center overflow-x-auto no-scrollbar py-4">
          {isMarketLoading ? <SkeletonText width="w-40" /> : marketIndices.map(market => (
            <div key={market.symbol} className="flex items-center gap-4 whitespace-nowrap min-w-fit">
              <span className="text-sm font-black text-gray-400">{market.name}</span>
              <span className={`text-lg font-black ${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                {market.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
              <span className={`text-xs font-black px-10 py-3 rounded-full ${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                {market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                <span className="text-[10px] opacity-70 ml-1">({market.status || '대기'})</span>
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-8 py-12 overflow-visible">
        <p className="text-sm font-black text-gray-400 mb-3 tracking-wider uppercase">Portfolio Balance</p>
        <div className="flex flex-wrap items-center gap-6 overflow-visible">
          <h2 className="text-5xl font-black tracking-tight leading-none overflow-visible">{totalCurrentAmount.toLocaleString()}원</h2>
          <div className={`px-10 py-3 rounded-full text-sm font-black min-w-max shadow-sm border ${parseFloat(totalRate) >= 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </div>
        </div>
      </section>

      <div className="h-4 bg-gray-50/60"></div>

      {/* Holdings Section */}
      <section className="px-8 py-12 overflow-visible">
        <h3 className="text-2xl font-black mb-12">나의 투자 현황</h3>
        
        {isInitialLoading ? <div className="space-y-6"><SkeletonText width="w-full" height="h-32" /></div> : stocks.length === 0 ? (
          /* [지시사항] 고정 높이 제거, p-8 flex-col items-center gap-6 적용, 버튼 위치 강제 속성 제거 */
          <div className="w-full h-auto min-h-fit p-8 bg-gray-50/50 rounded-[5rem] text-center border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-8 overflow-visible">
            <p className="text-gray-400 font-black leading-relaxed whitespace-pre-line text-lg max-w-xs overflow-visible">보유하신 종목을 등록해 보세요.{"\n"}AI가 즉시 전략을 제안합니다.</p>
            {/* 독립된 공간에 버튼 배치 (자연스러운 수직 쌓기) */}
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#3182f6] text-white px-12 py-7 rounded-full font-black shadow-[0_20px_40px_rgba(49,130,246,0.2)] active:scale-95 transition-all text-2xl">지금 시작하기</button>
          </div>
        ) : (
          <div className="space-y-14">
            {stocks.map(stock => {
              const isProfit = (stock.currentPrice || stock.avgPrice) >= stock.avgPrice;
              const rate = (( (stock.currentPrice || stock.avgPrice) / stock.avgPrice - 1) * 100).toFixed(1);
              return (
                <div key={stock.id} className="overflow-visible">
                  <div className="flex justify-between items-center p-5 -m-5 transition-all cursor-pointer overflow-visible" onClick={() => analyzeStockOrInterest(stock, true)}>
                    <div className="flex flex-row items-center gap-12 min-w-0 overflow-visible">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white ${isProfit ? 'bg-red-400' : 'bg-blue-400'}`}>{stock.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-2xl font-black text-[#191f28] leading-tight mb-2 whitespace-nowrap overflow-visible uppercase">{stock.name}</h4>
                        <p className="text-xs font-bold text-gray-400">{(stock.status || '실시간')} · {stock.quantity.toLocaleString()}주</p>
                      </div>
                    </div>
                    <div className="text-right min-w-max">
                      <p className="text-2xl font-black text-[#1b1c1e] mb-2">{(stock.currentPrice?.toLocaleString() || '--')}원</p>
                      <div className={`px-10 py-3 rounded-full text-xs font-black ${isProfit ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{isProfit ? '+' : ''}{rate}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Interests Section */}
      <section className="px-8 py-12 overflow-visible border-t-8 border-gray-50 mt-8">
        <h3 className="text-2xl font-black mb-12">관심있는 종목</h3>
        <div className="space-y-12">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            return (
              <div key={stock.id} className="flex items-center justify-between p-6 -m-6 rounded-[3rem] transition-all cursor-pointer overflow-visible" onClick={() => analyzeStockOrInterest(stock, false)}>
                <div className="flex items-center gap-10 min-w-0 overflow-visible">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 flex-shrink-0 shadow-sm">
                    <Bell size={28} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-2xl font-black text-[#191f28] whitespace-nowrap overflow-visible uppercase">{stock.name}</h4>
                    <p className="text-xs font-black text-gray-400 tracking-widest">{stock.symbol}</p>
                  </div>
                </div>
                <div className="text-right min-w-max">
                  <p className="text-2xl font-black text-[#191f28] mb-2">{(stock.price?.toLocaleString() || '--')}원</p>
                  <div className={`px-10 py-3 rounded-full text-xs font-black ${isUp ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{isUp ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%</div>
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
