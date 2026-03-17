"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, ChevronRight, Loader2, AlertCircle,
  BarChart3, PieChart, Info, X, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Holding {
  id: string | number;
  stock_code: string;
  stock_name: string;
  avg_buy_price: number;
  quantity: number;
  last_price: number | null;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ name: '', price: '', quantity: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHoldings = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_stocks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setHoldings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.name || !newStock.price || !newStock.quantity) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('portfolio_stocks').insert([{
        stock_name: newStock.name,
        stock_code: 'CUSTOM', // 실제 운영시 티커 자동 매핑 로직 필요
        avg_buy_price: parseFloat(newStock.price),
        quantity: parseFloat(newStock.quantity)
      }]);

      if (error) throw error;
      
      await fetchHoldings();
      setIsModalOpen(false);
      setNewStock({ name: '', price: '', quantity: '' });
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBuy = holdings.reduce((acc, h) => acc + (h.avg_buy_price * h.quantity), 0);
  const totalCurrent = holdings.reduce((acc, h) => acc + ((h.last_price || h.avg_buy_price) * h.quantity), 0);
  const totalProfit = totalCurrent - totalBuy;
  const profitRate = totalBuy > 0 ? (totalProfit / totalBuy * 100).toFixed(2) : '0.00';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-xs font-black text-slate-300 tracking-[0.3em] uppercase">Syncing Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      {/* 헤더 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-40">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Portfolio</h1>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Real-time Asset Management</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* 총 자산 요약 */}
        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl -mr-24 -mt-24 transition-all group-hover:scale-110"></div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                 <DollarSign size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Global Asset Balance</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter mb-4">{totalCurrent.toLocaleString()}원</h2>
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-black ${totalProfit >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {totalProfit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {totalProfit.toLocaleString()}원 ({profitRate}%)
                 </div>
              </div>
           </div>
        </section>

        {/* 세부 수치 */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-50 flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Buy</span>
              <p className="text-lg font-black text-slate-900">{totalBuy.toLocaleString()}원</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-gray-50 flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dividend Est.</span>
              <p className="text-lg font-black text-slate-900">0원</p>
           </div>
        </div>

        {/* 보유 종목 리스트 */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Asset Allocation</h3>
              <button onClick={fetchHoldings} className="text-slate-300 hover:text-blue-500">
                <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
           </div>

           {holdings.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-200">
                   <Wallet size={32} />
                </div>
                <p className="text-sm font-bold text-slate-300 leading-relaxed uppercase tracking-widest">Your portfolio is empty.<br/>Touch the + button to add assets.</p>
             </div>
           ) : (
             holdings.map(h => {
               const current = h.last_price || h.avg_buy_price;
               const profit = (current - h.avg_buy_price) * h.quantity;
               const rate = ((current / h.avg_buy_price - 1) * 100).toFixed(2);
               const isUp = parseFloat(rate) >= 0;

               return (
                 <div key={h.id} className="bg-white p-7 rounded-[2.25rem] shadow-sm border border-gray-100 hover:border-blue-100 transition-all group active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                             {h.stock_name.substring(0, 1)}
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-slate-900 tracking-tight">{h.stock_name}</h4>
                             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{h.quantity}주 · {h.avg_buy_price.toLocaleString()}원</p>
                          </div>
                       </div>
                       <ChevronRight className="text-slate-200" size={20} />
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Market Value</p>
                          <p className="text-xl font-black text-slate-900 tabular-nums">{(current * h.quantity).toLocaleString()}원</p>
                       </div>
                       <div className="text-right">
                          <span className={`px-4 py-1.5 rounded-xl text-xs font-black ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                             {isUp ? '▲' : '▼'} {rate}%
                          </span>
                       </div>
                    </div>
                 </div>
               );
             })
           )}
        </section>
      </div>

      {/* Add Holding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add Asset</h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddStock} className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Stock Name</label>
                    <input 
                      type="text" required placeholder="예: 삼성전자"
                      className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={newStock.name} onChange={e => setNewStock({ ...newStock, name: e.target.value })}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Avg. Cost</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                         value={newStock.price} onChange={e => setNewStock({ ...newStock, price: e.target.value })}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quantity</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                         value={newStock.quantity} onChange={e => setNewStock({ ...newStock, quantity: e.target.value })}
                       />
                    </div>
                 </div>
                 <button 
                   disabled={isSubmitting}
                   className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 uppercase tracking-widest text-xs"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Save Asset'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
