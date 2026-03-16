"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, 
  TrendingUp, TrendingDown, Eye, Search, ChevronLeft, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
}

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchInterests = async () => {
    try {
      const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (data) {
        setInterestStocks(data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async (silent = false) => {
    const symbols = interestStocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) return;
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store' // 캐싱 멸균
      });
      const data = await res.json();
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    fetchInterests();
    const interval = setInterval(() => fetchPrices(true), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if(interestStocks.length > 0) fetchPrices(true); }, [interestStocks.length]);

  const filtered = interestStocks.filter(s => s.name.includes(search) || s.symbol.includes(search));

  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="px-6 py-10 bg-white border-b border-slate-100 sticky top-0 z-40">
         <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-5">
                  <Link href="/" className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 border border-slate-100 transition-all">
                    <ChevronLeft size={24} />
                  </Link>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">관심 종목</h1>
               </div>
               <button onClick={() => { fetchInterests(); fetchPrices(); }} className="p-3.5 bg-slate-50 rounded-2xl text-slate-400">
                  <RefreshCcw size={22} className={isRefreshing ? 'animate-spin' : ''} />
               </button>
            </div>
            <div className="bg-slate-50 rounded-2xl px-6 h-16 flex items-center gap-4 border border-slate-100 focus-within:border-slate-300 transition-all">
               <Search className="text-slate-300" size={24} />
               <input 
                 type="text" 
                 placeholder="어떤 종목을 찾으시나요?" 
                 className="bg-transparent border-none outline-none font-bold text-lg text-slate-600 w-full placeholder:text-slate-200"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
            </div>
         </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 mt-12 space-y-6">
         {filtered.map(s => {
           const isUp = (s.change || 0) >= 0;
           return (
             <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-slate-900 transition-all">
                <div className="flex items-center gap-6 min-w-0">
                   <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <Star size={24} />
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-2xl font-bold text-slate-900 truncate mb-1">{s.name}</h4>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{s.symbol}</span>
                   </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <p className="text-2xl font-bold text-slate-900 tabular-nums">{(s.price?.toLocaleString() || '--')}</p>
                   <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {isUp ? '+' : ''}{s.change?.toFixed(2)}%
                   </span>
                </div>
             </div>
           );
         })}
      </div>
    </div>
  );
}
