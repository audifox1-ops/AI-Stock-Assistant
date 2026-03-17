"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, ChevronRight, Loader2, AlertCircle,
  BarChart3, PieChart, Info, X, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCcw,
  Bot, Sparkles, ShieldAlert, Target, Zap, Clock, ListFilter
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  id: string | number;
  stock_code: string;
  stock_name: string;
  avg_buy_price: number;
  quantity: number;
  last_price: number | null;
  position: '단기' | '스윙' | '장기';
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'전체' | '단기' | '스윙' | '장기'>('전체');

  // 모달 및 AI 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ name: '', price: '', quantity: '', position: '스윙' as '단기' | '스윙' | '장기' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 데이터 로드
  const loadHoldings = () => {
    setIsRefreshing(true);
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        const validated = parsed.map((h: any) => ({
          ...h,
          position: h.position || '스윙'
        }));
        setHoldings(validated);
      } else {
        setHoldings([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadHoldings();
  }, []);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.name || !newStock.price || !newStock.quantity) return;
    
    setIsSubmitting(true);
    const newItem: Holding = {
      id: Date.now(),
      stock_name: newStock.name,
      stock_code: 'CUSTOM', 
      avg_buy_price: parseFloat(newStock.price),
      quantity: parseFloat(newStock.quantity),
      last_price: parseFloat(newStock.price),
      position: newStock.position
    };

    const updated = [newItem, ...holdings];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    
    setIsSubmitting(false);
    setIsAddModalOpen(false);
    setNewStock({ name: '', price: '', quantity: '', position: '스윙' });
  };

  const fetchAiDiagnosis = async () => {
    if (holdings.length === 0) {
      alert("진단할 종목이 없습니다.");
      return;
    }
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    setAiDiagnosis(null);

    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: holdings })
      });
      const data = await res.json();
      setAiDiagnosis(data.diagnosis || data.error);
    } catch (e) {
      setAiDiagnosis("AI 진단 시스템 연결 실패.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredHoldings = holdings.filter(h => 
    activeSubTab === '전체' ? true : h.position === activeSubTab
  );

  const totalBuy = holdings.reduce((acc, h) => acc + (h.avg_buy_price * h.quantity), 0);
  const totalCurrent = holdings.reduce((acc, h) => acc + ((h.last_price || h.avg_buy_price) * h.quantity), 0);
  const totalProfit = totalCurrent - totalBuy;
  const profitRate = totalBuy > 0 ? (totalProfit / totalBuy * 100).toFixed(2) : '0.00';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">Loading Data...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      {/* 헤더 - [19차] 직각화 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50 rounded-none">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Portfolio</h1>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Institutional Sharp Tracking</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-none shadow-none active:scale-95 transition-all outline outline-1 outline-blue-700"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* 자산 요약 - [19차] 직각화 */}
        <section className="bg-white p-10 rounded-none shadow-none border border-slate-200 relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                 <DollarSign size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Global Sharp Balance</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter mb-4">{totalCurrent.toLocaleString()}W</h2>
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1 px-4 py-1.5 rounded-none text-xs font-black ${totalProfit >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} border border-current/10`}>
                    {totalProfit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {totalProfit.toLocaleString()}W ({profitRate}%)
                 </div>
              </div>
           </div>
        </section>

        {/* AI 진단 버튼 - [19차] 직각화 */}
        <button 
          onClick={fetchAiDiagnosis}
          className="w-full bg-slate-900 text-white p-7 rounded-none shadow-none flex items-center justify-between group active:bg-blue-600 transition-all border-b-4 border-blue-600"
        >
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-none flex items-center justify-center border border-white/20">
                 <Bot size={24} className="text-blue-400" />
              </div>
              <div className="text-left">
                 <p className="text-base font-black uppercase tracking-widest leading-none">AI 종합 진단</p>
                 <p className="text-[10px] text-white/50 font-bold mt-1.5 uppercase tracking-widest">Neural Asset Analysis</p>
              </div>
           </div>
           <Sparkles size={20} className="text-blue-400" />
        </button>

        {/* 탭 필터링 - [19차] 직각화 (Pill -> Box) */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 border-b border-slate-200">
           {['전체', '단기', '스윙', '장기'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveSubTab(tab as any)}
               className={`flex-shrink-0 px-8 py-3 rounded-none text-[11px] font-black uppercase tracking-widest transition-all ${
                 activeSubTab === tab 
                 ? 'bg-blue-600 text-white' 
                 : 'bg-white text-slate-400 border border-slate-100'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        {/* 리스트 - [19차] 직각화 */}
        <section className="space-y-4">
           {filteredHoldings.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-200 rounded-none p-20 text-center">
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No strategic assets in this sector</p>
             </div>
           ) : (
             filteredHoldings.map(h => {
               const current = h.last_price || h.avg_buy_price;
               const profit = (current - h.avg_buy_price) * h.quantity;
               const rate = ((current / h.avg_buy_price - 1) * 100).toFixed(2);
               const isUp = parseFloat(rate) >= 0;

               return (
                 <div key={h.id} className="bg-white p-8 rounded-none shadow-none border border-slate-200 hover:border-blue-500 transition-all group active:bg-slate-50">
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-none flex items-center justify-center font-black text-[10px] tracking-tighter uppercase border ${
                            h.position === '단기' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            h.position === '스윙' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-green-50 text-green-600 border-green-100'
                          }`}>
                             {h.position}
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-slate-900 tracking-tighter uppercase">{h.stock_name}</h4>
                             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{h.quantity} UNIT · {h.avg_buy_price.toLocaleString()}W</p>
                          </div>
                       </div>
                       <ChevronRight className="text-slate-200" size={18} />
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Current Valuation</p>
                          <p className="text-xl font-black text-slate-900 tabular-nums">{(current * h.quantity).toLocaleString()}W</p>
                       </div>
                       <div className="text-right">
                          <span className={`px-3 py-1 rounded-none text-[10px] font-black border ${isUp ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                             {isUp ? '+' : ''}{rate}%
                          </span>
                       </div>
                    </div>
                 </div>
               );
             })
           )}
        </section>
      </div>

      {/* 모달 - [19차] 직각화 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-none" onClick={() => setIsAddModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-none p-12 shadow-none border-t-4 border-slate-900">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Asset Registration</h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddStock} className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Identifier</label>
                    <input 
                      type="text" required placeholder="STOCK NAME"
                      className="w-full bg-slate-50 border border-slate-200 p-5 rounded-none font-bold text-slate-900 focus:border-blue-600 outline-none transition-all uppercase"
                      value={newStock.name} onChange={e => setNewStock({ ...newStock, name: e.target.value })}
                    />
                 </div>
                 
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Position</label>
                    <div className="grid grid-cols-3 gap-1">
                       {['단기', '스윙', '장기'].map((pos) => (
                         <button
                           key={pos}
                           type="button"
                           onClick={() => setNewStock({ ...newStock, position: pos as any })}
                           className={`py-4 rounded-none text-xs font-black transition-all border ${
                             newStock.position === pos 
                             ? 'bg-blue-600 text-white border-blue-600' 
                             : 'bg-slate-50 text-slate-400 border-slate-200'
                           }`}
                         >
                           {pos}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-px bg-slate-200">
                    <div className="bg-white p-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">AVG COST</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full bg-transparent p-2 rounded-none font-black text-slate-900 outline-none"
                         value={newStock.price} onChange={e => setNewStock({ ...newStock, price: e.target.value })}
                       />
                    </div>
                    <div className="bg-white p-2 space-y-2 border-l border-slate-200">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">QUANTITY</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full bg-transparent p-2 rounded-none font-black text-slate-900 outline-none"
                         value={newStock.quantity} onChange={e => setNewStock({ ...newStock, quantity: e.target.value })}
                       />
                    </div>
                 </div>
                 <button 
                   disabled={isSubmitting}
                   className="w-full bg-slate-900 text-white font-black py-7 rounded-none shadow-none active:bg-blue-600 transition-all uppercase tracking-[0.2em] text-xs mt-4"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Execute Registration'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* AI 진단 모달 - [19차] 직각화 */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-0">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => !isAiLoading && setIsAiModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[460px] rounded-none p-12 shadow-none max-h-[90vh] flex flex-col border-4 border-slate-900">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100 flex-shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-none flex items-center justify-center">
                       <Bot size={28} className="text-white" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Diagnostic Echo</h2>
                       <p className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-widest">Neural Asset Specialist</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAiModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-2 min-h-[300px]">
                 {isAiLoading ? (
                   <div className="h-full flex flex-col items-center justify-center py-24 gap-10">
                      <Loader2 className="animate-spin text-blue-600" size={64} />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">
                         Synthesizing Capital Patterns...<br/>Aligning strategic market nodes.
                      </p>
                   </div>
                 ) : (
                   <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-10">
                      <div className="bg-slate-50 p-10 border-l-8 border-blue-600">
                         <div className="whitespace-pre-wrap leading-[2] text-slate-900 font-bold text-[15px] tracking-tight uppercase">
                            {aiDiagnosis}
                         </div>
                      </div>
                      <div className="bg-slate-950 p-6 rounded-none flex items-center gap-5">
                         <ShieldAlert className="text-blue-500 flex-shrink-0" size={24} />
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            AI DIAGNOSTIC PROTOCOL: NO LEGAL LIABILITY ASSUMED. INVEST AT OWN DISCRETION.
                         </p>
                      </div>
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button onClick={() => setIsAiModalOpen(false)} className="w-full bg-slate-900 text-white font-black py-7 rounded-none shadow-none mt-10 uppercase tracking-[0.2em] text-[11px] hover:bg-blue-600 transition-all flex-shrink-0">
                   Confirm Strategy
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
