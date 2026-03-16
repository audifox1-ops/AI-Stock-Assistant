"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, RefreshCcw, Bell, Trash2, BellRing, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from "next-auth/react";

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
  const [pushSubscription, setPushSubscription] = useState<any>(null);

  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => { if (sub) setPushSubscription(sub); })
        .catch(console.error);
    }
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });
        setPushSubscription(sub);
        fetch('/api/push', { method: 'POST', body: JSON.stringify({ subscription: sub, title: "알림 연동 완료", body: "실시간 시세를 알려드릴게요.", url: "/" }) });
      }
    } catch (err) { alert('알림 설정을 확인해주세요.'); }
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
    if (!silent) setIsRefreshing(true);
    try {
      const symbols = Array.from(new Set([...stocks.map(s => s.symbol), ...interestStocks.map(s => s.symbol)])).filter(Boolean);
      if (symbols.length === 0) return;
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
    if (!confirm('삭제하시겠습니까?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); fetchInterests(); } catch (err) {}
  };

  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen">
      
      {/* Tosh Header */}
      <header className="px-6 pt-10 pb-4 bg-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
             <span className="text-xl font-black text-blue-600">A</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">AI Stock</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2.5 bg-gray-50 rounded-full text-gray-400">
            <Bell size={22} />
          </button>
          {session?.user?.image ? (
            <img src={session.user.image} alt="U" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <Plus size={20} />
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-xl mx-auto space-y-8 px-6 pb-20">
        
        {/* Market Index Section - Big & Bold */}
        <section className="pt-6 space-y-6">
          {isMarketLoading ? (
            <div className="h-24 bg-white rounded-3xl animate-pulse" />
          ) : marketIndices.slice(0, 1).map(market => (
            <div key={market.symbol} className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-50/50">
              <div className="flex justify-between items-start mb-6">
                <p className="text-sm font-black text-gray-300 uppercase tracking-widest">{market.name}</p>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full">
                   <p className="text-xs font-black text-[#EF4444]">+ {market.changePercent.toFixed(1)}%</p>
                </div>
              </div>
              <h2 className={`text-5xl font-extrabold tracking-tighter ${market.changePercent >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                {market.price.toLocaleString()}
              </h2>
              <div className="flex justify-between items-center mt-8">
                 <p className="text-[10px] font-black text-gray-300 uppercase">Real-time Trading Vol.</p>
                 <RefreshCcw size={14} className={`text-gray-200 ${isRefreshing ? 'animate-spin' : ''}`} />
              </div>
            </div>
          ))}
        </section>

        {/* Portfolio Card */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-50">
          <p className="text-xs font-black text-gray-300 mb-2 uppercase tracking-widest">Total My Assets</p>
          <div className="flex items-baseline gap-2 mb-8">
            <h3 className="text-3xl font-black text-gray-900">{totalCurrentAmount.toLocaleString()}</h3>
            <span className="text-xl font-black text-gray-500">{'원'}</span>
          </div>
          
          <button 
             onClick={requestNotificationPermission}
             className="w-full py-4.5 bg-[#3182f6] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
          >
            <BellRing size={18} />
            <span>관심 종목 추가로 알림 받기</span>
            <ArrowRight size={16} />
          </button>
        </section>

        {/* Watchlist Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-xl font-extrabold text-gray-900">내 관심 종목</h4>
            <button onClick={() => setIsAddModalOpen(true)} className="text-sm font-black text-blue-500">추가하기</button>
          </div>

          <div className="space-y-4">
            {interestStocks.length === 0 ? (
              <div className="py-20 bg-white rounded-[2rem] border border-dashed border-gray-100 text-center">
                <p className="text-gray-300 font-bold">궁금한 종목을 추가해보세요</p>
              </div>
            ) : interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between gap-6 group">
                  <div className="flex flex-col min-w-0 flex-1">
                    <h5 className="text-lg font-extrabold text-gray-900 truncate uppercase">{stock.name}</h5>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className="text-lg font-black text-gray-900 leading-none mb-1">
                      {(stock.price?.toLocaleString() || '--')}{'원'}
                    </p>
                    <div className={`flex items-center gap-1 font-black text-xs ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                       <span>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</span>
                       {isUp ? <ArrowRight className="-rotate-45" size={12} /> : <ArrowRight className="rotate-45" size={12} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-300">
                      <Bell size={18} />
                    </div>
                    <button 
                      onClick={() => removeInterest(stock.id)}
                      className="p-3 bg-gray-50 rounded-xl text-gray-100 group-hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modern Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-8 pt-24 flex flex-col animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight">종목 추가</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-gray-50 rounded-full text-gray-400">
              <X size={28} />
            </button>
          </div>
          
          <div className="space-y-12 flex-1">
             <div className="space-y-4">
                <label className="text-xs font-black text-gray-300 uppercase tracking-widest px-2">Stock Code</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full text-4xl font-black bg-transparent border-b-4 border-gray-100 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100"
                  placeholder="005930"
                  value={newStock.symbol}
                  onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                />
             </div>
             <div className="space-y-4">
                <label className="text-xs font-black text-gray-300 uppercase tracking-widest px-2">Alias Name</label>
                <input 
                  type="text" 
                  className="w-full text-2xl font-black bg-transparent border-b-4 border-gray-100 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100"
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
            className="w-full py-6 bg-[#3182f6] text-white rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 transition-all mb-10"
          >
            즐겨찾기 추가
          </button>
        </div>
      )}

    </div>
  );
}
