"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Wallet, TrendingUp, TrendingDown, Plus, X, Search, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity, Target,
  Bot, Sparkles, Loader2, ShieldAlert, RefreshCcw
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  id: string;
  itemCode: string;
  stockName: string;
  avgPrice: number;
  quantity: number;
  currentPrice: number;
  position: '단기' | '스윙' | '장기';
  fluctuationsRatio?: string;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'전체' | '단기' | '스윙' | '장기'>('전체');

  // 신규 종목 입력 상태
  const [newStock, setNewStock] = useState({
    itemCode: '',
    stockName: '',
    avgPrice: '',
    quantity: '',
    position: '단기' as '단기' | '스윙' | '장기'
  });

  // AI 진단 상태
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // 실시간 시세 연동
  const fetchRealtimePrices = async (targetHoldings: Holding[]) => {
    if (targetHoldings.length === 0) return;
    const codes = Array.from(new Set(targetHoldings.map(h => h.itemCode))).join(',');
    try {
      const res = await fetch(`/api/prices?codes=${codes}`);
      const data = await res.json();
      if (data.success) {
        setHoldings(prev => prev.map(h => {
          const live = data.data[h.itemCode];
          if (live) {
            return {
              ...h,
              currentPrice: typeof live.rawPrice === 'number' ? live.rawPrice : h.avgPrice,
              fluctuationsRatio: live.fluctuationsRatio
            };
          }
          return h;
        }));
      }
    } catch (e) {
      console.error('Failed to fetch prices:', e);
    }
  };

  const loadData = async () => {
    setIsRefreshing(true);
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setHoldings(parsed);
      await fetchRealtimePrices(parsed);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 동적 요약 계산 (useMemo 활용)
  const summary = useMemo(() => {
    const filtered = activeFilter === '전체' ? holdings : holdings.filter(h => h.position === activeFilter);
    
    let totalInvest = 0;
    let totalEval = 0;
    
    filtered.forEach(h => {
      totalInvest += (h.avgPrice * h.quantity);
      totalEval += (h.currentPrice * h.quantity);
    });
    
    const profitAmount = totalEval - totalInvest;
    const profitRate = totalInvest > 0 ? (profitAmount / totalInvest) * 100 : 0;
    
    return {
      totalInvest,
      totalEval,
      profitAmount,
      profitRate
    };
  }, [holdings, activeFilter]);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const holding: Holding = {
      id: Date.now().toString(),
      itemCode: newStock.itemCode || '000000',
      stockName: newStock.stockName,
      avgPrice: Number(newStock.avgPrice),
      quantity: Number(newStock.quantity),
      currentPrice: Number(newStock.avgPrice),
      position: newStock.position
    };

    const updated = [...holdings, holding];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setNewStock({ itemCode: '', stockName: '', avgPrice: '', quantity: '', position: '단기' });
    
    fetchRealtimePrices(updated);
  };

  const removeHolding = (id: string) => {
    const updated = holdings.filter(h => h.id !== id);
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAiDiagnosis = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("진단에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredHoldings = activeFilter === '전체' ? holdings : holdings.filter(h => h.position === activeFilter);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">자산 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50 rounded-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">내 보유 주식</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">실시간 수익률 동기화</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadData}
            className={`p-3 bg-slate-100 text-slate-900 rounded-none active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={20} />
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* 요약 카드 - [23차] 동적 계산 엔진 적용 */}
        <div className="bg-slate-900 p-8 rounded-none shadow-none relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">{activeFilter} 자산 평가액</p>
                  <h2 className="text-3xl font-black text-white tabular-nums tracking-tighter">
                    {summary.totalEval.toLocaleString()}원
                  </h2>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">실시간 수익률</p>
                  <p className={`text-xl font-black tabular-nums ${summary.profitAmount >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {summary.profitAmount >= 0 ? '+' : ''}{summary.profitRate.toFixed(2)}%
                  </p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
               <div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">총 매입금액</p>
                  <p className="text-sm font-bold text-white/80 tabular-nums">{summary.totalInvest.toLocaleString()}원</p>
               </div>
               <div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">총 손익</p>
                  <p className={`text-sm font-bold tabular-nums ${summary.profitAmount >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {summary.profitAmount.toLocaleString()}원
                  </p>
               </div>
            </div>
          </div>
          <PieChart className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32" />
        </div>

        {/* AI 진단 버튼 */}
        <button 
          onClick={handleAiDiagnosis}
          disabled={holdings.length === 0}
          className="w-full bg-white border-2 border-blue-600 p-6 rounded-none flex items-center justify-center gap-3 active:bg-blue-50 transition-all disabled:opacity-50 disabled:grayscale group"
        >
          <Bot size={24} className="text-blue-600 group-hover:animate-bounce" />
          <span className="text-[13px] font-black text-blue-600 uppercase tracking-widest">🤖 {activeFilter} 포트폴리오 정밀 진단</span>
        </button>

        {/* 필터 탭 */}
        <div className="flex gap-1 bg-slate-200 p-1 rounded-none border border-slate-200">
          {['전체', '단기', '스윙', '장기'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as any)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none ${activeFilter === f ? 'bg-white text-slate-900 shadow-none' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 종목 리스트 - 실시간 계산 렌더링 */}
        <div className="space-y-4">
          {filteredHoldings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 p-16 text-center rounded-none">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">해당 포지션에 등록된 종목이 없습니다</p>
            </div>
          ) : (
            filteredHoldings.map((h) => {
              const profit = (h.currentPrice - h.avgPrice) * h.quantity;
              const rate = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
              const isPlus = profit >= 0;

              return (
                <div key={h.id} className="bg-white p-7 rounded-none border border-slate-100 flex justify-between items-center group relative overflow-hidden active:bg-slate-50 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-none border uppercase text-[10px] font-black ${isPlus ? 'bg-red-50 border-red-100 text-red-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                      {h.position}
                    </div>
                    <div>
                      <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{h.stockName}</h4>
                      <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">
                        {h.itemCode} <span className="mx-1">|</span> {h.quantity}주 <span className="mx-1">|</span> {h.fluctuationsRatio || '0.00'}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-[16px] font-black tabular-nums ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                        {profit.toLocaleString()}원 ({isPlus ? '+' : ''}{rate.toFixed(2)}%)
                      </p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1">
                        현재 {h.currentPrice.toLocaleString()}원 <span className="mx-1 text-slate-100">/</span> 평단 {h.avgPrice.toLocaleString()}원
                      </p>
                    </div>
                    <button onClick={() => removeHolding(h.id)} className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 transition-colors border border-slate-100 rounded-none active:scale-90">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[400px] rounded-none p-10 shadow-none border-t-4 border-slate-900">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">새 보유 종목 등록</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">종목명/코드</label>
                <div className="relative">
                  <input 
                    type="text" required placeholder="종목 정보 입력"
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all uppercase"
                    value={newStock.stockName} onChange={e => setNewStock({...newStock, stockName: e.target.value})}
                  />
                  <input 
                    type="text" placeholder="코드(선택)"
                    className="w-full mt-2 bg-slate-50 border border-slate-200 p-2 text-xs rounded-none font-bold text-slate-400 outline-none focus:border-blue-600 transition-all"
                    value={newStock.itemCode} onChange={e => setNewStock({...newStock, itemCode: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매수 평단가</label>
                  <input 
                    type="number" required placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all uppercase"
                    value={newStock.avgPrice} onChange={e => setNewStock({...newStock, avgPrice: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">보유 수량</label>
                  <input 
                    type="number" required placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all uppercase"
                    value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">투자 포지션 선택</label>
                <div className="flex gap-2">
                  {['단기', '스윙', '장기'].map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => setNewStock({...newStock, position: p as any})}
                      className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest border transition-all rounded-none ${newStock.position === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white font-black py-5 rounded-none uppercase tracking-widest text-xs mt-4 hover:bg-blue-600 transition-all shadow-none">
                자산 데이터 저장
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI 진단 모달 */}
      {isAiLoading || aiAnalysis ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-0">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-none" onClick={() => !isAiLoading && setAiAnalysis(null)}></div>
          <div className="relative bg-white w-full max-w-[400px] rounded-none p-10 shadow-none border-4 border-blue-600 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">AI 계좌 정밀 진단</h2>
              <button onClick={() => setAiAnalysis(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
            </div>
            <div className="min-h-[300px]">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-8">
                  <Bot size={56} className="text-blue-600 animate-bounce" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">포트폴리오 분석 시스템 가동 중...</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 p-8 border-l-8 border-blue-600">
                    <p className="text-[14px] font-bold leading-relaxed text-slate-800 whitespace-pre-wrap uppercase tracking-tight">
                      {aiAnalysis}
                    </p>
                  </div>
                  <p className="text-[9px] font-bold text-slate-300 mt-10 text-center uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                    <ShieldAlert size={14} className="text-blue-500" /> GEMINI AI 시스템에 의해 생성된 전략 리포트입니다
                  </p>
                </div>
              )}
            </div>
            {!isAiLoading && (
              <button onClick={() => setAiAnalysis(null)} className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-10 uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">
                분석 종료
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
