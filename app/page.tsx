"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, RefreshCcw, Bell, Trash2, BellRing, ArrowRight, TrendingUp, TrendingDown, Star, Wallet, Eye } from 'lucide-react';
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('알림 권한이 허용되었습니다.');
      }
    } catch (err) { alert('브라우저 알림 권한을 허용해주세요.'); }
  };

  const fetchMarketIndices = async (silent = false) => {
    if (!silent) setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error(error); }
    finally { if (!silent) setIsMarketLoading(false); }
  };

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
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stocks.length > 0 || interestStocks.length > 0) fetchPrices(true);
  }, [stocks.length, interestStocks.length]);

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제할까요?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); fetchInterests(); } catch (err) {}
  };

  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 bg-white flex justify-between items-center sticky top-0 z-30 border-b border-gray-100/50 backdrop-blur-xl bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3182f6] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
             <span className="text-2xl font-black text-white tracking-tighter">A</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#191f28]">AI Stock</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => fetchMarketIndices()} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-[#3182f6] transition-all active:scale-90">
            <RefreshCcw size={22} className={isMarketLoading ? 'animate-spin' : ''} />
          </button>
          {session?.user?.image && (
            <img src={session.user.image} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-gray-100" />
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-8 space-y-10">
        
        {/* 1. Multi-Index Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-lg font-black text-gray-900">시장 지표</h3>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Global Market</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {marketIndices.map(market => (
              <div key={market.symbol} className="min-w-[160px] bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{market.name}</span>
                <h2 className={`text-2xl font-black tracking-tighter ${market.changePercent >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {market.price.toLocaleString()}
                </h2>
                <div className={`text-[10px] font-black flex items-center gap-1 ${market.changePercent >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                  {market.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(market.changePercent).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Portfolio Asset Card */}
        <section className="bg-white p-9 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3182f6]/5 rounded-bl-[5rem] -mr-8 -mt-8" />
          <p className="text-xs font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Total Portfolio</p>
          <div className="flex items-baseline gap-2 mb-8">
            <h3 className="text-4xl font-black text-[#191f28] tracking-tight">{totalCurrentAmount.toLocaleString()}</h3>
            <span className="text-xl font-black text-gray-400">{'원'}</span>
            <div className={`ml-3 px-3 py-1 rounded-full text-[10px] font-black ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
              {parseFloat(totalRate) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(totalRate))}%
            </div>
          </div>
          <button 
             onClick={requestNotificationPermission}
             className="w-full h-16 bg-[#3182f6] text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg hover:bg-[#1b64da] transition-all active:scale-[0.98]"
          >
            <BellRing size={20} />
            <span>실시간 목표가 알림 설정</span>
          </button>
        </section>

        {/* 3. Holdings Section (내 주식) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-2">
              <Wallet size={20} className="text-[#3182f6]" strokeWidth={3} />
              내 주식
              <span className="text-sm font-black text-gray-300">{stocks.length}</span>
            </h4>
          </div>
          <div className="space-y-4">
            {stocks.length === 0 ? (
              <div className="p-10 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center text-gray-300 font-bold">
                보유한 주식이 없습니다.
              </div>
            ) : stocks.map(stock => {
              const profitRate = stock.currentPrice ? ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2) : '0.00';
              const isProfit = parseFloat(profitRate) >= 0;
              return (
                <div key={stock.id} className="bg-white pl-8 pr-8 py-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-lg font-black text-[#191f28] truncate mb-1 uppercase tracking-tight">{stock.name}</h5>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stock.symbol} · {stock.quantity}주</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-[#191f28]">{(stock.currentPrice || stock.avgPrice).toLocaleString()}원</p>
                      <span className={`text-xs font-black ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isProfit ? '+' : ''}{profitRate}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-black text-gray-300">
                    <span>평단가: {stock.avgPrice.toLocaleString()}원</span>
                    <span className="px-3 py-1 bg-gray-50 rounded-lg text-gray-400">{stock.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Watchlist Section (관심 종목) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-2">
              <Eye size={20} className="text-amber-400" strokeWidth={3} />
              관심 종목
            </h4>
            <button onClick={() => setIsAddModalOpen(true)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-[#3182f6] transition-all">
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-4">
            {interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white pl-8 pr-8 py-7 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between gap-6 group hover:shadow-md transition-all">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-lg font-black text-[#191f28] truncate mb-0.5 uppercase tracking-tight">{stock.name}</h5>
                    <span className="text-[10px] font-black text-gray-400/50 uppercase tracking-widest">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className="text-lg font-black text-[#191f28] leading-none mb-1.5">
                      {(stock.price?.toLocaleString() || '--')}{'원'}
                    </p>
                    <div className={`text-[11px] font-black flex items-center gap-1 ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                       <span>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</span>
                       {isUp ? <ArrowRight className="-rotate-45" size={12} strokeWidth={3} /> : <ArrowRight className="rotate-45" size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => removeInterest(stock.id)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-200 hover:bg-red-50 hover:text-[#EF4444] transition-all">
                      <Trash2 size={18} strokeWidth={2.5} />
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
              <h2 className="text-4xl font-black tracking-tight text-[#191f28]">종목 찾기</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-gray-50 rounded-full text-gray-400">
                <X size={28} />
              </button>
           </div>
           
           <div className="space-y-12 flex-1 overflow-y-auto px-4 no-scrollbar pb-10">
              <div className="space-y-4">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-widest">Ticker Code</label>
                 <input 
                   type="text" 
                   autoFocus
                   className="w-full text-4xl font-black bg-transparent border-b-8 border-gray-50 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100 transition-all uppercase"
                   placeholder="005930"
                   value={newStock.symbol}
                   onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-widest">Stock Name</label>
                 <input 
                   type="text" 
                   className="w-full text-2xl font-black bg-transparent border-b-8 border-gray-50 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100 transition-all"
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
                if (!sym.includes('.') && /^\d{6}$/.test(sym)) sym += '.KS';
                await supabase.from('alerts').insert([{ symbol: sym, stock_name: newStock.name, alert_enabled: true }]);
                fetchInterests();
                setIsAddModalOpen(false);
                setNewStock({ name: '', symbol: '' });
             }}
             className="w-full h-20 bg-[#3182f6] text-white rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all mb-10"
           >
             관심 종목에 추가하기
           </button>
        </div>
      )}
    </div>
  );
}
