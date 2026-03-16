"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, RefreshCcw, TrendingUp, TrendingDown, Wallet, Star, BarChart3, Bot, Sparkles, Loader2, Landmark
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Stock {
  id: string | number;
  symbol: string;
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  changePercent?: number;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' }); // 캐싱 멸균
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (e) {}
  };

  const fetchHoldings = async () => {
    try {
      const { data } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (data) {
        setStocks(data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity)
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async () => {
    const symbols = stocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store' // 캐싱 멸균
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent 
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  const runAnalysis = async (stock: Stock) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.currentPrice || stock.avgPrice,
          changePercent: stock.changePercent || 0
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("AI 분석 일시 중단");
    } finally { setIsAiLoading(false); }
  };

  useEffect(() => {
    fetchMarket();
    fetchHoldings();
    const interval = setInterval(() => {
      fetchMarket();
      fetchPrices();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if(stocks.length > 0) fetchPrices(); }, [stocks.length]);

  const totalCurrent = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuy = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalRate = totalBuy > 0 ? ((totalCurrent / totalBuy - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="px-6 py-8 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-40">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" /> AI-Stock
        </h1>
        <button onClick={() => { fetchMarket(); fetchPrices(); }} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
           <RefreshCcw className={isRefreshing ? 'animate-spin' : ''} size={22} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 mt-10 space-y-12">
        {/* Market Section - Toss Style Rectangular Cards */}
        <section className="grid grid-cols-2 gap-4">
           {marketIndices.map(m => (
             <div key={m.symbol} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase">{m.name}</p>
                <div className="flex justify-between items-end">
                   <h2 className={`text-2xl font-bold ${m.changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{m.price.toLocaleString()}</h2>
                   <span className={`text-xs font-black px-2 py-1 rounded-lg ${m.changePercent >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {m.changePercent >= 0 ? '+' : ''}{m.changePercent.toFixed(1)}%
                   </span>
                </div>
             </div>
           ))}
        </section>

        {/* Portfolio Status Summary */}
        <section className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-2 text-slate-400 mb-6">
              <Wallet size={16} />
              <span className="text-xs font-black uppercase tracking-widest">My Total Assets</span>
           </div>
           <div className="flex items-baseline gap-4 mb-10">
              <h2 className="text-5xl font-bold text-slate-900 tabular-nums">{totalCurrent.toLocaleString()}원</h2>
              <p className={`text-lg font-bold ${parseFloat(totalRate) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
           </div>
           <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-50">
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-1">총 수익</p>
                 <p className={`text-xl font-bold ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-1">투자 원금</p>
                 <p className="text-xl font-bold text-slate-900">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI Insight Section */}
        <section className="space-y-6">
           <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
             <Sparkles className="text-blue-600" /> AI 투자 인사이트
           </h3>
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
              {isAiLoading ? (
                <div className="py-10 text-center flex flex-col items-center gap-5">
                   <Loader2 className="animate-spin opacity-50" size={40} />
                   <p className="text-xs font-bold opacity-30 tracking-[0.3em]">ANALYZING MARKET...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in duration-700">
                   <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black w-fit mb-6 uppercase tracking-widest">Strategy Report</div>
                   <p className="text-lg font-bold leading-relaxed text-slate-200 whitespace-pre-line italic">
                      "{aiAnalysis}"
                   </p>
                </div>
              ) : (
                <div className="py-10 text-center opacity-20">
                   <Bot size={48} className="mx-auto mb-4" />
                   <p className="text-sm font-bold">보유 종목을 선택하여 전략을 확인하세요.</p>
                </div>
              )}
           </div>
        </section>

        {/* Holding List - Wide Rectangular Cards */}
        <section className="space-y-6">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-bold text-slate-900">내 주식</h3>
              <span className="text-sm font-bold text-slate-400">전체 {stocks.length}</span>
           </div>
           <div className="space-y-4">
              {stocks.map(s => {
                const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                const isProfit = parseFloat(profitRate) >= 0;
                return (
                  <div key={s.id} onClick={() => { setSelectedStock(s); runAnalysis(s); }} className="w-full flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer transition-all hover:bg-slate-50">
                     <div className="flex flex-col gap-1">
                        <h4 className="text-xl font-bold text-slate-900">{s.name}</h4>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{s.symbol} · {s.quantity}주</span>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <p className="text-2xl font-bold text-slate-900 tabular-nums">{(s.currentPrice || s.avgPrice).toLocaleString()}</p>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                           {isProfit ? '+' : ''}{profitRate}%
                        </span>
                     </div>
                  </div>
                );
              })}
           </div>
        </section>
      </div>
    </div>
  );
}
