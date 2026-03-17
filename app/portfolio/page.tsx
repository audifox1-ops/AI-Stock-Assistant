"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, ArrowDownRight,
  Target, ShieldAlert, Bot, Sparkles, Loader2, X, Trash2, RefreshCcw, ChevronRight,
  AlertCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  itemCode: string;
  stockName: string;
  avgPrice: number;
  quantity: number;
  category: string; 
  targetPrice: number;
  stopLossPrice: number;
  currentPrice?: number;
  changeRate?: number;
  volume?: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    itemCode: '',
    stockName: '',
    avgPrice: '',
    quantity: '',
    category: '스윙',
    targetPrice: '',
    stopLossPrice: ''
  });

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  const fetchRealtimePrices = async (currentHoldings: Holding[]) => {
    if (!currentHoldings || currentHoldings.length === 0) return;
    setIsSyncing(true);
    const codes = currentHoldings.map(h => String(h.itemCode).trim()).join(',');
    try {
      const res = await fetch(`/api/market?tickers=${codes}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        const rtData = data.data; // [{ ticker, price, changeRate, volume }, ...]
        
        // 데이터 병합(Merge) 로직: 'String() 형변환 및 강제 매칭' 적용
        const merged = currentHoldings.map(local => {
          // 서버 ticker와 로컬 itemCode를 String으로 강제 변환하여 매칭
          const rt = rtData.find((r: any) => String(r.ticker).trim() === String(local.itemCode).trim());
          if (rt && rt.price > 0) {
            return {
              ...local,
              // 실시간 시세(rt.price)를 Number 타입으로 매칭된 항목에 주입
              currentPrice: Number(rt.price),
              changeRate: rt.changeRate !== undefined ? Number(rt.changeRate) : (local.changeRate || 0),
              volume: rt.volume !== undefined ? Number(rt.volume) : (local.volume || 0)
            };
          }
          return local;
        });
        
        setHoldings(merged);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.error('Portfolio Sync Error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHoldings(parsed);
          await fetchRealtimePrices(parsed);
        }
      }
    } catch (e) {
      console.error(e);
      setHoldings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHoldings = useMemo(() => {
    const list = Array.isArray(holdings) ? holdings : [];
    if (activeFilter === '전체') return list;
    return list.filter(h => h.category === activeFilter);
  }, [holdings, activeFilter]);

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalValuation = 0;

    (filteredHoldings || []).forEach(h => {
      // 계산 엔진: 실시간 현재가(currentPrice)가 있으면 최우선 적용하여 자산 평가
      const current = (h.currentPrice && h.currentPrice > 0) ? h.currentPrice : (h.avgPrice || 0);
      totalInvested += (h.avgPrice || 0) * (h.quantity || 0);
      totalValuation += current * (h.quantity || 0);
    });

    const totalProfit = totalValuation - totalInvested;
    const profitRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      invested: totalInvested,
      valuation: totalValuation,
      profit: totalProfit,
      rate: profitRate
    };
  }, [filteredHoldings]);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    const newHolding: Holding = {
      itemCode: formData.itemCode.trim(),
      stockName: formData.stockName.trim(),
      avgPrice: Number(formData.avgPrice),
      quantity: Number(formData.quantity),
      category: formData.category,
      targetPrice: Number(formData.targetPrice),
      stopLossPrice: Number(formData.stopLossPrice),
    };

    const currentList = Array.isArray(holdings) ? holdings : [];
    const updated = [newHolding, ...currentList];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setFormData({ itemCode: '', stockName: '', avgPrice: '', quantity: '', category: '스윙', targetPrice: '', stopLossPrice: '' });
    
    await fetchRealtimePrices(updated);
  };

  const removeHolding = (itemCode: string) => {
    const currentList = Array.isArray(holdings) ? holdings : [];
    const updated = currentList.filter(h => String(h.itemCode).trim() !== String(itemCode).trim());
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  };

  const analyzePortfolio = async () => {
    setIsAnalysisModalOpen(true);
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: filteredHoldings })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      <header className="px-6 py-8 bg-white border-b border-gray-100 sticky top-0 z-[100] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Asset.AI</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2">Portfolio Management Node</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all shadow-lg"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['전체', '단기', '스윙', '장기'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none border ${
                activeFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {isSyncing && (
        <div className="px-6 py-2 bg-blue-600 flex items-center justify-center gap-2 animate-pulse">
          <Loader2 size={12} className="text-white animate-spin" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">실시간 시세 데이터 동기화 중...</span>
        </div>
      )}

      <main className="px-6 mt-8 space-y-8">
        <div className="bg-slate-900 p-8 rounded-none shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Market Valuation</p>
            <div className="flex items-end gap-3 mb-8">
               <h2 className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">
                {summary.valuation.toLocaleString()}
               </h2>
               <span className="text-xl font-bold text-white/50 pb-0.5 uppercase">KRW</span>
            </div>
            
            <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">총 손익금</p>
                <div className={`flex items-center gap-2 ${summary.profit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                   {summary.profit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                   <span className="text-lg font-black tabular-nums">{summary.profit.toLocaleString()}원</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">총 수익률</p>
                <span className={`text-lg font-black tabular-nums ${summary.rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {summary.rate >= 0 ? '+' : ''}{summary.rate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={analyzePortfolio} className="w-full bg-white border-4 border-slate-900 p-6 flex items-center justify-center gap-4 hover:bg-slate-50 transition-all shadow-xl">
          <Bot size={24} className="text-blue-600" />
          <span className="text-sm font-black text-slate-900 uppercase tracking-widest">AI 자산 건전성 진단</span>
        </button>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-slate-200" size={32} />
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-5">
              <AlertCircle size={40} className="text-slate-100" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">운용 중인 포지션이 없습니다</p>
            </div>
          ) : (
            (filteredHoldings || []).map((h, i) => {
              // 리스트 렌더링 쐐기 로직: 실시간 현재가(h.currentPrice)가 0보다 크면 무조건 우선 적용
              const current = (h.currentPrice && h.currentPrice > 0) ? h.currentPrice : h.avgPrice;
              const profit = (current - h.avgPrice) * h.quantity;
              const rate = h.avgPrice > 0 ? ((current - h.avgPrice) / h.avgPrice) * 100 : 0;
              const isPlus = profit >= 0;

              return (
                <div key={`${h.itemCode}-${i}`} className="bg-white border-2 border-slate-100 rounded-none overflow-hidden hover:border-blue-200 transition-all shadow-sm">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase">
                          {h.category}
                        </div>
                        <div>
                          <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{h.stockName}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h.itemCode}</p>
                        </div>
                      </div>
                      <button onClick={() => removeHolding(h.itemCode)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 mb-6 font-sans">
                      <div className="bg-white p-4 font-sans">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Buying Prc</p>
                        <p className="text-sm font-black text-slate-900 tabular-nums">{h.avgPrice.toLocaleString()}원</p>
                      </div>
                      <div className="bg-white p-4 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Real-time Prc</p>
                        <p className="text-sm font-black text-slate-900 tabular-nums">
                          {current > 0 ? `${current.toLocaleString()}원` : '-'}
                        </p>
                      </div>
                      <div className="bg-white p-4 col-span-2 border-t border-slate-50 flex justify-between items-center font-sans">
                         <span className={`text-[15px] font-black tabular-nums ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                           {isPlus ? '+' : ''}{rate.toFixed(2)}% ({profit.toLocaleString()}원)
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty: {h.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 종목 추가 모달 - 가독성 전면 개선 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[450px] rounded-none p-12 border-t-8 border-slate-900 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-10 pb-6 border-b-2 border-slate-100">Asset Registration</h2>
            <form onSubmit={handleAddHolding} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticker</label>
                     <input type="text" required placeholder="005930" 
                        // 가독성을 위해 흰 배경, 검정 글자색, 테두리 강화
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.itemCode} onChange={e => setFormData({...formData, itemCode: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                     <input type="text" required placeholder="삼성전자" 
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.stockName} onChange={e => setFormData({...formData, stockName: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Buying Price</label>
                     <input type="number" required placeholder="매수가" 
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.avgPrice} onChange={e => setFormData({...formData, avgPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                     <input type="number" required placeholder="수량" 
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-blue-500">Target Prc</label>
                     <input type="number" required placeholder="목표가" 
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.targetPrice} onChange={e => setFormData({...formData, targetPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-red-500">Stop Loss</label>
                     <input type="number" required placeholder="손절가" 
                        className="w-full bg-white text-slate-900 border-2 border-slate-200 p-4 font-black outline-none focus:border-blue-500 placeholder:text-slate-400"
                        value={formData.stopLossPrice} onChange={e => setFormData({...formData, stopLossPrice: e.target.value})} />
                  </div>
               </div>
               <button className="w-full bg-slate-900 text-white font-black py-7 rounded-none uppercase tracking-[0.3em] text-xs hover:bg-blue-600 active:scale-[0.98] transition-all mt-6 shadow-xl shadow-slate-100">
                  Commit Registration
               </button>
            </form>
          </div>
        </div>
      )}

      {/* 분석 성과 모달 유지 */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
           <div className="absolute inset-0" onClick={() => !isAiLoading && setIsAnalysisModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[500px] rounded-none p-12 border-t-[16px] border-slate-900 shadow-2xl">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Analysis Report</h2>
                 <button onClick={() => setIsAnalysisModalOpen(false)} className="p-3 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>
              <div className="min-h-[300px] font-sans">
                 {isAiLoading ? (
                   <div className="py-20 flex flex-col items-center justify-center gap-6">
                      <Loader2 size={32} className="text-blue-600 animate-spin" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Processing Insights...</p>
                   </div>
                 ) : (
                   <div className="text-[14px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis}
                   </div>
                 )}
              </div>
              <button onClick={() => setIsAnalysisModalOpen(false)} className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-10 uppercase tracking-widest text-xs">Acknowledge</button>
           </div>
        </div>
      )}
    </div>
  );
}
