"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Search, ChevronLeft, Star, Trash2
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
        cache: 'no-store'
      });
      const data = await res.json();
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    try {
      await supabase.from('alerts').delete().eq('id', id);
      fetchInterests();
    } catch (err) {}
  };

  useEffect(() => {
    fetchInterests();
    const interval = setInterval(() => fetchPrices(true), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if(interestStocks.length > 0) fetchPrices(true); }, [interestStocks.length]);

  const filtered = interestStocks.filter(s => s.name.includes(search) || s.symbol.includes(search));

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      <header className="px-5 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400">
             <ChevronLeft size={22} />
           </Link>
           <h1 className="text-xl font-bold tracking-tight text-slate-900">관심 종목</h1>
        </div>
        <button onClick={() => { fetchInterests(); fetchPrices(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400">
           <RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-5 mt-6 space-y-6">
         {/* 검색 바 */}
         <div className="bg-white rounded-2xl px-5 h-14 flex items-center gap-3 border border-gray-100 shadow-sm focus-within:border-blue-200 transition-all">
            <Search className="text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="종목 이름 또는 티커 검색" 
              className="bg-transparent border-none outline-none font-bold text-base text-slate-600 w-full placeholder:text-slate-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
         </div>

         {/* 관심 종목 리스트 - Toss 직사각형 스타일 적용 */}
         <div className="space-y-3 pb-20">
            {filtered.map(s => {
              const isUp = (s.change || 0) >= 0;
              return (
                <div key={s.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group active:scale-[0.98] transition-all">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-400">
                         <Star size={20} fill="currentColor" className="opacity-80" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-lg font-bold text-slate-900 truncate">{s.name}</h4>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.symbol}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-5">
                      <div className="text-right flex flex-col items-end gap-0.5">
                         <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">{(s.price?.toLocaleString() || '--')}</p>
                         <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isUp ? '+' : ''}{s.change?.toFixed(2)}%
                         </span>
                      </div>
                      <button onClick={() => removeInterest(s.id)} className="p-2 text-slate-200 hover:text-red-400 transition-colors">
                         <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
               <div className="py-20 text-center">
                  <p className="text-sm font-bold text-slate-300">등록된 관심 종목이 없습니다.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
