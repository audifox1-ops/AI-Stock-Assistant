"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, BellRing, 
  ArrowRight, TrendingUp, TrendingDown, Star, Wallet, Eye, BarChart3 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from "next-auth/react";

// --- Interfaces ---
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
  changePercent?: number;
  updatedAt?: string;
}

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  updatedAt?: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  updatedAt?: string;
}

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('실시간 주가 및 수급 알림이 활성화되었습니다.');
      }
    } catch (err) { console.error(err); }
  };

  // 시장 지수 가저오기 (KOSPI, KOSDAQ, NASDAQ)
  const fetchMarketIndices = async (silent = false) => {
    if (!silent) setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error(error); }
    finally { if (!silent) setIsMarketLoading(false); }
  };

  // 보유 종목 가져오기
  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setStocks(data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity),
          type: item.position_type as string, target: Number(item.target_price), stopLoss: Number(item.stop_loss)
        })));
      }
    } catch (err) {}
  };

  // 관심 종목 가져오기
  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setInterestStocks(data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null, alertEnabled: item.alert_enabled
        })));
      }
    } catch (err) {}
  };

  // 실시간 시세 업데이트
  const fetchPrices = async (silent = false) => {
    const symbols = Array.from(new Set([...stocks.map(s => s.symbol), ...interestStocks.map(s => s.symbol)])).filter(Boolean);
    if (symbols.length === 0) return;
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { method: 'POST', body: JSON.stringify({ symbols }), cache: 'no-store' });
      const data = await res.json();
      setStocks(prev => prev.map(s => data[s.symbol] ? { ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
    } catch (error) {}
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    fetchMarketIndices();
    fetchHoldings();
    fetchInterests();
    const interval = setInterval(() => {
      fetchMarketIndices(true);
      fetchPrices(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stocks.length > 0 || interestStocks.length > 0) fetchPrices(true);
  }, [stocks.length, interestStocks.length]);

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); fetchInterests(); } catch (err) {}
  };

  // 포트폴리오 계산
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50/30 pb-32">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-white sticky top-0 z-40 border-b border-gray-100/50 backdrop-blur-2xl bg-white/80 transition-all flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#3182f6] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-all">
             <BarChart3 size={28} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-[#191f28] leading-none">AI Stock</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Smart Investor</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { fetchMarketIndices(); fetchPrices(); }} 
            className="p-3 bg-gray-100 rounded-2xl text-gray-500 hover:text-[#3182f6] hover:bg-blue-50 transition-all active:rotate-180 duration-500"
          >
            <RefreshCcw size={22} className={isRefreshing || isMarketLoading ? 'animate-spin' : ''} />
          </button>
          {session?.user?.image && (
            <img src={session.user.image} alt="U" className="w-11 h-11 rounded-2xl border-2 border-white shadow-md select-none" />
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-10 space-y-12">
        
        {/* Market Indices - 다중 지수 수평 리스트 */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-black text-[#191f28]">시장 지수</h3>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">Real-time Feed</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
            {marketIndices.map(market => (
              <div key={market.symbol} className="min-w-[180px] bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-4 snap-start hover:shadow-md transition-all">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{market.name}</span>
                <h2 className={`text-3xl font-black tracking-tighter ${market.changePercent >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {market.price.toLocaleString()}
                </h2>
                <div className={`text-xs font-black flex items-center gap-1.5 ${market.changePercent >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {market.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(market.changePercent).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio Summary Card (최상단 배치) */}
        <section className="bg-white p-10 rounded-[3rem] shadow-[0_30px_70px_rgba(49,130,246,0.08)] border border-blue-50/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#3182f6]/5 rounded-bl-[8rem] -mr-12 -mt-12 transition-transform duration-1000 group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="text-[#3182f6]" size={16} strokeWidth={3} />
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">Total Assets</p>
            </div>
            <div className="flex items-baseline gap-2 mb-10">
              <h3 className="text-5xl font-black text-[#191f28] tracking-tighter">{totalCurrentAmount.toLocaleString()}</h3>
              <span className="text-2xl font-black text-gray-400">{'원'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-50/50 p-6 rounded-3xl">
                <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">수익금</span>
                <p className={`text-xl font-black ${totalProfit >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50/50 p-6 rounded-3xl">
                <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">수익률</span>
                <p className={`text-xl font-black ${parseFloat(totalRate) >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
                </p>
              </div>
            </div>

            <button 
               onClick={requestNotificationPermission}
               className="w-full h-20 bg-[#3182f6] text-white rounded-[1.5rem] font-black flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(49,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <BellRing size={24} className="animate-pulse" />
              <span className="text-lg tracking-tight">강력한 수급 알림 받기</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </section>

        {/* 1. 보유 종목 리스트 (와이드 카드) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-3">
               내 주식
               <span className="text-xs font-black px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full">{stocks.length}</span>
            </h4>
          </div>
          <div className="space-y-4">
            {stocks.length === 0 ? (
               <div className="p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4 opacity-50">
                  <span className="text-4xl text-gray-200">📦</span>
                  <p className="text-gray-300 font-bold">보유하신 종목이 아직 없습니다.</p>
               </div>
            ) : stocks.map(stock => {
              const profitRate = stock.currentPrice ? ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2) : '0.00';
              const isProfit = parseFloat(profitRate) >= 0;
              return (
                <div key={stock.id} className="bg-white pl-8 pr-8 py-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-xl font-black text-[#191f28] truncate uppercase tracking-tight">{stock.name}</h5>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-500 rounded-md">{stock.type}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{stock.symbol} · {stock.quantity}주</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-[#191f28]">{(stock.currentPrice || stock.avgPrice).toLocaleString()}원</p>
                      <div className={`text-xs font-black inline-flex items-center gap-1 mt-1 ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isProfit ? '+' : ''}{profitRate}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-black text-gray-300 uppercase">Average Buy</span>
                       <span className="text-xs font-extrabold text-[#191f28]">{stock.avgPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                       <span className="text-[9px] font-black text-gray-300 uppercase">Market Value</span>
                       <span className="text-xs font-extrabold text-[#191f28]">{((stock.currentPrice || stock.avgPrice) * stock.quantity).toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 관심 종목 리스트 (와이드 카드) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-3">
               관심 종목
               <Eye size={20} className="text-[#3182f6]" strokeWidth={3} />
            </h4>
            <button 
               onClick={() => setIsAddModalOpen(true)}
               className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-[#3182f6] transition-all"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-4">
            {interestStocks.length === 0 ? (
               <div className="p-12 bg-white rounded-[2.5rem] border border-gray-100 text-center text-gray-300 font-bold opacity-50">
                  지켜보는 종목이 없습니다.
               </div>
            ) : interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white pl-8 pr-8 py-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between gap-6 hover:shadow-md transition-all group">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-black text-[#191f28] truncate mb-1 uppercase tracking-tight">{stock.name}</h5>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className="text-xl font-black text-[#191f28] leading-none mb-2 tracking-tight">
                      {(stock.price?.toLocaleString() || '--')}{'원'}
                    </p>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${isUp ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
                       <span>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</span>
                       {isUp ? <ArrowRight className="-rotate-45" size={14} strokeWidth={3} /> : <ArrowRight className="rotate-45" size={14} strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-300 opacity-0 group-hover:opacity-100 transition-all hover:text-[#3182f6]">
                      <Bell size={22} strokeWidth={2.5} />
                    </button>
                    <button 
                       onClick={() => removeInterest(stock.id)}
                       className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-200 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-[#EF4444]"
                    >
                      <Trash2 size={22} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-8 pt-24 flex flex-col animate-in slide-in-from-bottom duration-500">
           <div className="flex justify-between items-center mb-16 px-4">
              <h2 className="text-4xl font-black tracking-tight text-[#191f28]">종목 코드 찾기</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-gray-100 rounded-full text-gray-400 rotate-90 active:scale-90 transition-all">
                <X size={28} />
              </button>
           </div>
           
           <div className="space-y-12 flex-1 overflow-y-auto px-4 no-scrollbar pb-10">
              <div className="space-y-6">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-widest pl-2">Ticker Code</label>
                 <input 
                   type="text" 
                   autoFocus
                   className="w-full text-5xl font-black bg-transparent border-b-[10px] border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all uppercase tracking-tighter"
                   placeholder="005930"
                   value={newStock.symbol}
                   onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                 />
              </div>
              <div className="space-y-6">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-widest pl-2">Stock Name</label>
                 <input 
                   type="text" 
                   className="w-full text-3xl font-black bg-transparent border-b-[10px] border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all"
                   placeholder="삼성전자"
                   value={newStock.name}
                   onChange={e => setNewStock({...newStock, name: e.target.value})}
                 />
              </div>
           </div>

           <button 
             onClick={async () => {
                if (!newStock.symbol || !newStock.name) return;
                let sym = newStock.symbol.toUpperCase().trim();
                // 코스피/코스닥 심볼 자동 보정
                if (!sym.includes('.') && /^\d{6}$/.test(sym)) {
                    sym += (sym.startsWith('0') || sym.startsWith('1') || sym.startsWith('2')) ? '.KS' : '.KQ';
                }
                await supabase.from('alerts').insert([{ symbol: sym, stock_name: newStock.name, alert_enabled: true }]);
                fetchInterests();
                setIsAddModalOpen(false);
                setNewStock({ name: '', symbol: '' });
             }}
             className="w-full h-24 bg-[#3182f6] text-white rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-[0.97] transition-all mb-10 flex items-center justify-center gap-4"
           >
             <span>관심 목록에 추가하기</span>
             <ArrowRight size={28} />
           </button>
        </div>
      )}
    </div>
  );
}
