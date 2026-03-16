"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Plus, X, Trash2, TrendingUp, TrendingDown, Eye, RefreshCcw, Search, Star, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  updatedAt?: string;
}

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ name: '', symbol: '' });

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setInterestStocks(data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null
        })));
      }
    } catch (err) {}
  };

  const fetchPrices = async (silent = false) => {
    const symbols = Array.from(new Set(interestStocks.map(s => s.symbol))).filter(Boolean);
    if (symbols.length === 0) return;
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { method: 'POST', body: JSON.stringify({ symbols }), cache: 'no-store' });
      const data = await res.json();
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
    } catch (error) {}
    finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    fetchInterests();
    const interval = setInterval(() => fetchPrices(true), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (interestStocks.length > 0) fetchPrices(true);
  }, [interestStocks.length]);

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); fetchInterests(); } catch (err) {}
  };

  const handleAddInterest = async () => {
    if (!newStock.name || !newStock.symbol) {
      alert('모든 정보를 입력해 주세요.');
      return;
    }
    
    let sym = newStock.symbol.toUpperCase().trim();
    if (!sym.includes('.') && /^\d{6}$/.test(sym)) {
        sym += (sym.startsWith('0') || sym.startsWith('1') || sym.startsWith('2')) ? '.KS' : '.KQ';
    }

    try {
      const { error } = await supabase.from('alerts').insert([{
        stock_name: newStock.name,
        symbol: sym,
        alert_enabled: true
      }]);
      
      if (error) throw error;
      
      fetchInterests();
      setIsAddModalOpen(false);
      setNewStock({ name: '', symbol: '' });
      alert('관심 종목에 추가되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-10 bg-white sticky top-0 z-50 border-b border-gray-100 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
               <ChevronLeft size={28} />
            </Link>
            <div>
               <h1 className="text-2xl font-black text-[#191f28]">관심 종목 리스트</h1>
               <p className="text-[10px] font-black text-[#3182f6] uppercase tracking-widest mt-1">Smart Stock Monitoring</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button 
               onClick={() => fetchPrices()}
               className={`p-3 bg-gray-50 rounded-2xl text-gray-500 transition-all ${isRefreshing ? 'animate-spin text-[#3182f6]' : ''}`}
            >
               <RefreshCcw size={22} />
            </button>
            <button 
               onClick={() => setIsAddModalOpen(true)}
               className="p-3 bg-[#3182f6] rounded-2xl text-white shadow-lg shadow-blue-50 active:scale-95 transition-all"
            >
               <Plus size={22} />
            </button>
         </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-10 space-y-4">
         {interestStocks.length > 0 ? (
            interestStocks.map(stock => {
               const isUp = (stock.change || 0) >= 0;
               return (
                  <div key={stock.id} className="bg-white px-8 py-8 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all active:scale-[0.99] overflow-hidden relative">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-50 opacity-0 group-hover:opacity-100 transition-all" />
                     <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                           <h5 className="text-xl font-bold text-[#191f28] truncate">{stock.name}</h5>
                           <div className="w-1 h-1 bg-gray-200 rounded-full" />
                           <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{stock.symbol}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Star size={12} className="text-amber-400 fill-amber-400" />
                           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Premium Watchlist Active</span>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-10">
                        <div className="text-right">
                           <p className="text-xl font-black text-[#191f28] mb-1.5 leading-none">
                              {(stock.price?.toLocaleString() || '--')}원
                           </p>
                           <div className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${isUp ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
                              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                           </div>
                        </div>
                        
                        <button 
                           onClick={() => removeInterest(stock.id)}
                           className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-200 hover:bg-red-50 hover:text-[#EF4444] transition-all opacity-0 group-hover:opacity-100"
                        >
                           <Trash2 size={20} />
                        </button>
                     </div>
                  </div>
               );
            })
         ) : (
            <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-20 text-center flex flex-col items-center gap-6">
               <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200">
                  <Eye size={40} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-400">관심 종목을 채워보세요.</h3>
                  <p className="text-sm font-bold text-gray-300">잠재력 높은 종목을 찾아 리스트에 추가하세요.</p>
               </div>
               <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-black hover:bg-blue-50 hover:text-[#3182f6] transition-all"
               >
                  지금 바로 추가하기
               </button>
            </div>
         )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md p-6 flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 space-y-10 animate-in slide-in-from-bottom-6 duration-500 shadow-2xl">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3182f6]">
                       <Sparkles size={24} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-[#191f28]">새 관심 종목</h2>
                       <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1 px-0.5">Add to Prime Watchlist</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-300 hover:text-gray-900 transition-colors">
                    <X size={26} />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">종목명 (예: 삼성전자)</label>
                    <input 
                      type="text" 
                      className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-xl outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-300 transition-all placeholder:text-gray-200"
                      placeholder="삼성전자"
                      value={newStock.name}
                      onChange={e => setNewStock({...newStock, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">티커 코드 (예: 005930)</label>
                    <input 
                      type="text" 
                      className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-xl outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-300 transition-all placeholder:text-gray-200 uppercase"
                      placeholder="005930"
                      value={newStock.symbol}
                      onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                    />
                 </div>
              </div>

              <button 
                onClick={handleAddInterest}
                className="w-full h-20 bg-[#3182f6] text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-100 hover:bg-[#1b64da] active:scale-[0.98] transition-all"
              >
                리스트에 등록하기
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
