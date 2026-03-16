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
    }, 5000); // 5초 실시간 동기화
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
      alert('종목명과 티커를 모두 입력해 주세요.');
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
      alert('관심 종목에 추가되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header Section */}
      <header className="px-6 pt-16 pb-12 bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-bl-[160px] -z-10" />
        <div className="flex justify-between items-center mb-10 px-2 relative z-10">
           <div className="flex items-center gap-5">
              <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#3182f6] transition-all border border-gray-100">
                <ChevronLeft size={28} />
              </Link>
              <div className="flex flex-col">
                 <h1 className="text-3xl font-black text-[#191f28] tracking-tight">전체 관심 종목</h1>
                 <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm animate-pulse" />
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
                       Real-time Sync Active (5s)
                    </p>
                 </div>
              </div>
           </div>
           <button 
             onClick={() => { fetchInterests(); fetchPrices(); }}
             className="p-3.5 bg-gray-50 rounded-2xl text-gray-500 hover:text-[#3182f6] transition-colors border border-gray-100"
           >
              <RefreshCcw size={22} className={isRefreshing ? 'animate-spin' : ''} />
           </button>
        </div>

        <div className="px-2 relative z-10">
           <div className="bg-gray-50 rounded-2xl px-8 h-18 flex items-center gap-5 border border-gray-50 focus-within:border-blue-100 transition-all">
              <Search className="text-gray-300" size={24} />
              <input 
                type="text" 
                placeholder="검색어를 입력하여 종목 필터링" 
                className="bg-transparent border-none outline-none font-bold text-lg text-gray-600 w-full placeholder:text-gray-200"
              />
           </div>
        </div>
      </header>

      {/* Main Content Section */}
      <div className="max-w-xl mx-auto px-6 mt-12 space-y-8">
        <div className="flex justify-between items-center px-2">
           <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Watchlist</h3>
              <p className="text-[10px] font-bold text-gray-300 uppercase leading-none">Total {interestStocks.length} Monitoring</p>
           </div>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="flex items-center gap-2 px-6 py-3 bg-[#3182f6] text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-50 hover:bg-[#1b64da] transition-all active:scale-95"
           >
              <Plus size={20} />
              종목 추가
           </button>
        </div>

        <div className="px-1">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            return (
              /* 물리적 강제 복구: 모든 종목 카드는 rounded-2xl 스타일과 flex justify-between 구조를 가짐 */
              <div 
                key={stock.id} 
                className="bg-white p-6 rounded-2xl shadow-sm mb-4 flex justify-between items-center border border-gray-100 group hover:border-[#3182f6]/30 transition-all"
              >
                <div className="flex items-center gap-6 min-w-0 flex-1">
                   <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-[#3182f6] transition-colors flex-shrink-0">
                      <Star size={24} className={stock.alertEnabled ? 'fill-[#3182f6] text-[#3182f6]' : ''} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <h4 className="text-xl font-black text-[#191f28] truncate mb-0.5 group-hover:text-[#3182f6] transition-colors uppercase">
                        {stock.name}
                      </h4>
                      <div className="flex items-center gap-2.5">
                         <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                           {stock.symbol}
                         </span>
                         {stock.updatedAt && (
                           <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tight">
                             Synced {stock.updatedAt}
                           </span>
                         )}
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-6 ml-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-[#191f28] tracking-tighter leading-tight">
                      {(stock.price?.toLocaleString() || '--')}원
                    </p>
                    <div className={`text-[11px] font-black flex items-center justify-end mt-1 ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                      {isUp ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                      {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-l border-gray-100 pl-6">
                     <button 
                       onClick={() => toggleAlert(stock)}
                       className={`p-2.5 rounded-xl transition-all ${stock.alertEnabled ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-300'}`}
                       title="알림 토글"
                     >
                       <Bell size={18} className={stock.alertEnabled ? 'animate-bounce' : ''} />
                     </button>
                     <button 
                        onClick={() => removeInterest(stock.id)}
                        className="p-2.5 bg-red-50 text-red-400 hover:bg-[#EF4444] hover:text-white rounded-xl transition-all"
                        title="영구 삭제"
                     >
                        <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              </div>
            );
          })}

          {interestStocks.length === 0 && (
            <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] py-24 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                 <Eye size={40} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xl font-bold text-gray-400">관심 종목을 등록해 보세요!</h4>
                 <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Start tracking your favorate stocks</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-10 py-4 bg-[#191f28] text-white rounded-2xl font-black text-base shadow-xl active:scale-95 transition-all"
              >
                 + 지금 첫 종목 추가
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Interest Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-lg p-8 flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 space-y-10 animate-in slide-in-from-bottom-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50/50 rounded-br-[120px] -z-10" />
              <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                 <div>
                    <h2 className="text-3xl font-black text-[#191f28] tracking-tighter">관심 종목 등록</h2>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                       <Landmark size={12} />
                       Asset Monitoring System
                    </p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-gray-50 rounded-xl text-gray-300 hover:text-gray-900 transition-colors">
                    <X size={24} />
                 </button>
              </div>
              <div className="space-y-8">
                 <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">종목 이름</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-black text-xl outline-none focus:ring-4 focus:ring-blue-50 border-2 border-transparent focus:border-blue-100 transition-all placeholder:text-gray-200"
                      placeholder="예: 태웅"
                      value={targetStock.name}
                      onChange={e => setTargetStock({...targetStock, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">티커 번호</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-black text-xl outline-none focus:ring-4 focus:ring-blue-50 border-2 border-transparent focus:border-blue-100 transition-all placeholder:text-gray-200 uppercase tracking-widest"
                      placeholder="예: 044490"
                      value={targetStock.symbol}
                      onChange={e => setTargetStock({...targetStock, symbol: e.target.value})}
                    />
                 </div>
              </div>
              <div className="pt-2 flex flex-col gap-4">
                 <button 
                  onClick={handleAddInterest}
                  className="w-full h-18 bg-[#191f28] text-white rounded-2xl font-black text-xl shadow-xl hover:bg-[#3182f6] transition-all active:scale-[0.98]"
                 >
                   모니터링 대상에 추가
                 </button>
                 <p className="text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                   Automatic Suffix (.KS/.KQ) applied
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-32 text-center px-12 pb-24 opacity-10">
         <div className="flex justify-center items-center gap-3 mb-2">
            <BarChart3 className="text-gray-900" size={28} />
            <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase">AI STOCK Monitoring</span>
         </div>
         <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.8em]">Deep Analysis Engine v1.8.0X</p>
      </footer>
    </div>
  );
}
