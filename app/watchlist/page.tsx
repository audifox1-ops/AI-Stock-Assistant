"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, 
  TrendingUp, TrendingDown, Eye, Search, ChevronLeft, Landmark, Star, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from "next-auth/react";
import Link from 'next/link';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  updatedAt?: string;
}

export default function WatchlistPage() {
  const { data: session } = useSession();
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [targetStock, setTargetStock] = useState({ name: '', symbol: '' });

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
        ...s, 
        price: data[s.symbol].price, 
        change: data[s.symbol].changePercent,
        updatedAt: data[s.symbol].updatedAt
      } : s));
    } catch (error) {}
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    fetchInterests();
    const interval = setInterval(() => {
      fetchPrices(true);
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (interestStocks.length > 0 && interestStocks.some(s => s.price === null)) {
      fetchPrices(true);
    }
  }, [interestStocks.length]);

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목 리스트에서 영구 삭제하시겠습니까?')) return;
    try {
      await supabase.from('alerts').delete().eq('id', id);
      setInterestStocks(prev => prev.filter(s => s.id !== id));
      alert('정상적으로 삭제되었습니다.');
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleAlert = async (stock: InterestStock) => {
    const nextState = !stock.alertEnabled;
    try {
      await supabase.from('alerts').update({ alert_enabled: nextState }).eq('id', stock.id);
      setInterestStocks(prev => prev.map(s => s.id === stock.id ? { ...s, alertEnabled: nextState } : s));
    } catch (err) {}
  };

  const handleAddInterest = async () => {
    if (!targetStock.name || !targetStock.symbol) {
      alert('종목 정보가 누락되었습니다.');
      return;
    }

    let sym = targetStock.symbol.toUpperCase().trim();
    if (!sym.includes('.') && /^\d{6}$/.test(sym)) {
        sym += (sym.startsWith('0') || sym.startsWith('1') || sym.startsWith('2')) ? '.KS' : '.KQ';
    }

    try {
      const { error } = await supabase.from('alerts').insert([{
        stock_name: targetStock.name,
        symbol: sym,
        alert_enabled: true
      }]);
      if (error) throw error;
      
      fetchInterests();
      setIsAddModalOpen(false);
      setTargetStock({ name: '', symbol: '' });
      alert('관심 종목에 등록되었습니다.');
    } catch (err) {
      alert('데이터 저장 실패');
    }
  };

  const filteredStocks = interestStocks.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      <header className="px-6 py-10 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-5">
                 <Link href="/" className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
                    <ChevronLeft size={28} />
                 </Link>
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Watchlist</h1>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Real-time Smart Monitoring</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                <Plus size={28} />
              </button>
           </div>

           <div className="bg-slate-50 rounded-2xl px-6 h-16 flex items-center gap-4 border border-slate-100 focus-within:border-slate-300 transition-all">
              <Search className="text-slate-300" size={24} />
              <input 
                type="text" 
                placeholder="관심 종목 검색 및 필터링" 
                className="bg-transparent border-none outline-none font-bold text-lg text-slate-600 w-full placeholder:text-slate-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-4">
        {filteredStocks.map(stock => {
          const isUp = (stock.change || 0) >= 0;
          return (
            <div 
              key={stock.id} 
              className="w-full flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-slate-900 transition-all"
            >
              <div className="flex items-center gap-6 min-w-0">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <Star size={24} className={stock.alertEnabled ? 'fill-current' : ''} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-2xl font-bold text-slate-900 truncate uppercase mb-1">{stock.name}</h4>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stock.symbol}</span>
                     {stock.updatedAt && (
                       <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight tracking-tighter">Synced {stock.updatedAt}</span>
                     )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-10">
                <div className="text-right flex flex-col items-end">
                  <p className="text-2xl font-bold text-slate-900 tracking-tighter leading-none mb-2">
                    {(stock.price?.toLocaleString() || '--')}
                  </p>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                   <button 
                     onClick={() => toggleAlert(stock)}
                     className={`p-3 rounded-xl transition-all ${stock.alertEnabled ? 'bg-emerald-50 text-emerald-500 shadow-sm' : 'bg-slate-50 text-slate-300'}`}
                   >
                     <Bell size={20} className={stock.alertEnabled ? 'animate-pulse' : ''} />
                   </button>
                   <button 
                      onClick={() => removeInterest(stock.id)}
                      className="p-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm shadow-red-50"
                   >
                      <Trash2 size={20} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStocks.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-32 text-center flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-100">
               <Eye size={48} />
            </div>
            <div className="space-y-2">
               <h4 className="text-2xl font-bold text-slate-400">관심 종목이 없습니다.</h4>
               <p className="text-sm font-bold text-slate-200 uppercase tracking-widest">Global Market Opportunity is waiting</p>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 px-12 py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-slate-200 active:scale-95 transition-all"
            >
               + 첫 종목 등록하기
            </button>
          </div>
        )}
      </div>

      {/* Add Interest Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm p-8 flex items-center justify-center">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-12 space-y-12 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">종목 추가</h2>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Asset Intelligence Network</p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                    <X size={28} />
                 </button>
              </div>
              <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">종목명</label>
                    <input 
                      type="text" 
                      className="w-full h-18 bg-slate-50 rounded-2xl px-8 font-bold text-xl outline-none border-2 border-transparent focus:border-slate-900 transition-all placeholder:text-slate-200"
                      placeholder="예: 카카오"
                      value={targetStock.name}
                      onChange={e => setTargetStock({...targetStock, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">티커 번호</label>
                    <input 
                      type="text" 
                      className="w-full h-18 bg-slate-50 rounded-2xl px-8 font-bold text-xl outline-none border-2 border-transparent focus:border-slate-900 transition-all placeholder:text-slate-200 uppercase tracking-widest"
                      placeholder="예: 035720"
                      value={targetStock.symbol}
                      onChange={e => setTargetStock({...targetStock, symbol: e.target.value})}
                    />
                 </div>
              </div>
              <button 
                onClick={handleAddInterest}
                className="w-full h-20 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-slate-100 hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                관심 목록에 등록
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
