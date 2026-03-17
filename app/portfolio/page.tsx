"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Wallet, TrendingUp, TrendingDown, Plus, X, Search, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity, Target,
  Bot, Sparkles, Loader2, ShieldAlert, RefreshCcw, AlertTriangle, Crosshair
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
  targetPrice: number;
  stopLossPrice: number;
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
    targetPrice: '',
    stopLossPrice: '',
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
      // 레거시 데이터 호환성 처리: targetPrice, stopLossPrice가 없으면 0으로 초기화
      const migrated = parsed.map((h: any) => ({
        ...h,
        targetPrice: h.targetPrice || 0,
        stopLossPrice: h.stopLossPrice || 0
      }));
      setHoldings(migrated);
      await fetchRealtimePrices(migrated);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 동적 요약 계산
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
    return { totalInvest, totalEval, profitAmount, profitRate };
  }, [holdings, activeFilter]);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const holding: Holding = {
      id: Date.now().toString(),
      itemCode: newStock.itemCode || '000000',
      stockName: newStock.stockName,
      avgPrice: Number(newStock.avgPrice),
      quantity: Number(newStock.quantity),
      targetPrice: Number(newStock.targetPrice),
      stopLossPrice: Number(newStock.stopLossPrice),
      currentPrice: Number(newStock.avgPrice),
      position: newStock.position
    };

    const updated = [...holdings, holding];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setNewStock({ itemCode: '', stockName: '', avgPrice: '', quantity: '', targetPrice: '', stopLossPrice: '', position: '단기' });
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
        body: JSON.stringify({ portfolio: holdings })
      });
      const data = await res.json();
      setAiAnalysis(data.diagnosis || data.error);
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
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">기계적 매매 타이밍 트래킹</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-3 bg-slate-100 text-slate-900 rounded-none active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCcw size={20} />
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900">
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* 요약 카드 */}
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
          </div>
          <PieChart className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32" />
        </div>

        {/* AI 진단 버튼 */}
        <button onClick={handleAiDiagnosis} disabled={holdings.length === 0} className="w-full bg-white border-2 border-blue-600 p-6 rounded-none flex items-center justify-center gap-3 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:grayscale group">
          <Bot size={24} className="text-blue-600 group-hover:animate-bounce" />
          <span className="text-[13px] font-black text-blue-600 uppercase tracking-widest">🤖 {activeFilter} 전략적 매매 지침 진단</span>
        </button>

        {/* 필터 탭 */}
        <div className="flex gap-1 bg-slate-200 p-1 rounded-none border border-slate-200">
          {['전체', '단기', '스윙', '장기'].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f as any)} className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none ${activeFilter === f ? 'bg-white text-slate-900 shadow-none' : 'text-slate-400 hover:text-slate-600'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* 종목 리스트 */}
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

              // 타이밍 게이지 로직
              const isTargetImminent = h.targetPrice > 0 && h.currentPrice >= h.targetPrice * 0.9;
              const isStopLossDanger = h.stopLossPrice > 0 && (h.currentPrice <= h.stopLossPrice * 1.1 || h.currentPrice <= h.stopLossPrice);
              
              // 현재가 위치 계산 (손절가 ~ 목표가 사이의 백분율)
              const range = h.targetPrice - h.stopLossPrice;
              const progress = range > 0 ? Math.min(Math.max(((h.currentPrice - h.stopLossPrice) / range) * 100, 0), 100) : 50;

              return (
                <div key={h.id} className="bg-white rounded-none border border-slate-100 flex flex-col group active:bg-slate-50 transition-all overflow-hidden">
                  <div className="p-7 flex justify-between items-center">
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
                      <button onClick={() => removeHolding(h.id)} className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 transition-colors border border-slate-100 rounded-none">
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 타이밍 게이지 UI */}
                  <div className="px-7 pb-7 space-y-3">
                    <div className="relative h-1 bg-slate-100 w-full rounded-none overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${isTargetImminent ? 'bg-red-500' : isStopLossDanger ? 'bg-blue-500' : 'bg-slate-400'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">손절가</p>
                        <p className="text-[11px] font-black text-blue-500 tabular-nums">{h.stopLossPrice.toLocaleString()}원</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">목표가</p>
                        <p className="text-[11px] font-black text-red-500 tabular-nums">{h.targetPrice.toLocaleString()}원</p>
                      </div>
                    </div>
                    
                    {/* 상태 메시지 인디케이터 */}
                    {isTargetImminent && (
                      <div className="bg-red-50 border border-red-100 p-3 flex items-center gap-2 animate-pulse">
                        <Crosshair size={14} className="text-red-500" />
                        <p className="text-[11px] font-bold text-red-600 uppercase tracking-tighter">
                          🎯 목표가 도달 임박 (+{((h.currentPrice / h.targetPrice) * 100).toFixed(0)}%) - 익절 준비!
                        </p>
                      </div>
                    )}
                    {isStopLossDanger && (
                      <div className="bg-blue-50 border border-blue-100 p-3 flex items-center gap-2 animate-pulse">
                        <AlertTriangle size={14} className="text-blue-500" />
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter">
                          ⚠️ 손절선 이탈 위험 ({((h.currentPrice / h.stopLossPrice) * 100 - 100).toFixed(0)}%) - 리스크 관리!
                        </p>
                      </div>
                    )}
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
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">자산 등록 센터</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">기본 정보</label>
                <input 
                  type="text" required placeholder="종목명"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all uppercase"
                  value={newStock.stockName} onChange={e => setNewStock({...newStock, stockName: e.target.value})}
                />
                <input 
                  type="text" placeholder="종목 코드"
                  className="w-full mt-2 bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all"
                  value={newStock.itemCode} onChange={e => setNewStock({...newStock, itemCode: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매수 평단</label>
                  <input type="number" required placeholder="0" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" value={newStock.avgPrice} onChange={e => setNewStock({...newStock, avgPrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">보유 수량</label>
                  <input type="number" required placeholder="0" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest font-sans">목표가 (TP)</label>
                  <input type="number" required placeholder="최종 수익 목표" className="w-full bg-red-50/30 border border-red-100 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-red-500 transition-all" value={newStock.targetPrice} onChange={e => setNewStock({...newStock, targetPrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-sans">손절가 (SL)</label>
                  <input type="number" required placeholder="최종 리스크 방어" className="w-full bg-blue-50/30 border border-blue-100 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newStock.stopLossPrice} onChange={e => setNewStock({...newStock, stopLossPrice: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">포지션</label>
                <div className="flex gap-2">
                  {['단기', '스윙', '장기'].map((p) => (
                    <button key={p} type="button" onClick={() => setNewStock({...newStock, position: p as any})} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest border transition-all rounded-none ${newStock.position === p ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white font-black py-5 rounded-none uppercase tracking-widest text-xs mt-4 hover:bg-blue-600 transition-all">
                포트폴리오 자산 동기화
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
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">AI 전략 매매 리포트</h2>
              <button onClick={() => setAiAnalysis(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
            </div>
            <div className="min-h-[300px]">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-8">
                  <Bot size={56} className="text-blue-600 animate-bounce" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">기계적 매매 전략 시뮬레이션 중...</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 p-8 border-l-8 border-blue-600">
                    <p className="text-[14px] font-bold leading-relaxed text-slate-800 whitespace-pre-wrap uppercase tracking-tight">
                      {aiAnalysis}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {!isAiLoading && (
              <button onClick={() => setAiAnalysis(null)} className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-10 uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">
                지침 확인 완료
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
