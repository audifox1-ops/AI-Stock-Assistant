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
  category: string; // '단기' | '스윙' | '장기'
  targetPrice: number;
  stopLossPrice: number;
  currentPrice?: number;
  fluctuationsRatio?: string;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // 모달 입력 상태
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

  // 데이터 로드 및 실시간 시세 동기화 로직 보강
  const fetchRealtimePrices = async (currentHoldings: Holding[]) => {
    if (currentHoldings.length === 0) return;
    setIsSyncing(true);
    const codes = currentHoldings.map(h => h.itemCode).join(',');
    try {
      const res = await fetch(`/api/prices?codes=${codes}`);
      const data = await res.json();
      if (data.success) {
        const updated = currentHoldings.map(h => {
          const live = data.data[h.itemCode];
          if (live) {
            // "54,000" 형태의 문자열을 숫자로 변환
            const priceNum = parseInt(live.closePrice.replace(/,/g, ''));
            return {
              ...h,
              currentPrice: priceNum,
              fluctuationsRatio: live.fluctuationsRatio
            };
          }
          return h;
        });
        setHoldings(updated);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to sync portfolio prices:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHoldings(parsed);
        // 즉시 실시간 데이터 동기화
        await fetchRealtimePrices(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 필터링된 데이터 계산
  const filteredHoldings = useMemo(() => {
    if (activeFilter === '전체') return holdings;
    return holdings.filter(h => h.category === activeFilter);
  }, [holdings, activeFilter]);

  // 성과 요약 계산
  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalValuation = 0;

    filteredHoldings.forEach(h => {
      const current = h.currentPrice || h.avgPrice;
      totalInvested += h.avgPrice * h.quantity;
      totalValuation += current * h.quantity;
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
      itemCode: formData.itemCode,
      stockName: formData.stockName || '신규종목',
      avgPrice: Number(formData.avgPrice),
      quantity: Number(formData.quantity),
      category: formData.category,
      targetPrice: Number(formData.targetPrice),
      stopLossPrice: Number(formData.stopLossPrice),
    };

    const updated = [newHolding, ...holdings];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setFormData({ itemCode: '', stockName: '', avgPrice: '', quantity: '', category: '스윙', targetPrice: '', stopLossPrice: '' });
    
    // 추가 즉시 실시간 데이터 갱신
    await fetchRealtimePrices(updated);
  };

  const removeHolding = (itemCode: string) => {
    const updated = holdings.filter(h => h.itemCode !== itemCode);
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">내 포트폴리오</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">AI 자산 관리 엔진 가동 중</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['전체', '단기', '스윙', '장기'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none border ${
                activeFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* 실시간 시세 동기화 상태 표시 */}
      {isSyncing && (
        <div className="px-6 py-2 bg-blue-600 flex items-center justify-center gap-2 animate-pulse">
          <Loader2 size={12} className="text-white animate-spin" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">실시간 포트폴리오 시세 동기화 중...</span>
        </div>
      )}

      <main className="px-6 mt-8 space-y-8">
        {/* 요약 카드 */}
        <div className="bg-slate-900 p-8 rounded-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
             <Wallet size={120} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Total Portfolio Summary</p>
            <div className="flex items-end gap-3 mb-8">
               <h2 className="text-4xl font-black text-white tabular-nums tracking-tighter">
                {summary.valuation.toLocaleString()}
               </h2>
               <span className="text-xl font-bold text-white/50 pb-1 italic">KRW</span>
            </div>
            
            <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">총 수익금</p>
                <div className={`flex items-center gap-2 ${summary.profit >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                   {summary.profit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                   <span className="text-lg font-black tabular-nums">{summary.profit.toLocaleString()}원</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">수익률</p>
                <span className={`text-lg font-black tabular-nums ${summary.rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  {summary.rate >= 0 ? '+' : ''}{summary.rate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI 진단 버튼 */}
        <button 
          onClick={analyzePortfolio}
          className="w-full bg-white border-2 border-slate-900 p-6 flex items-center justify-center gap-4 hover:bg-slate-50 active:scale-[0.98] transition-all group"
        >
          <Bot size={24} className="text-blue-600 group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-black text-slate-900 uppercase tracking-widest">AI 포트폴리오 정밀 진단 가동</span>
        </button>

        {/* 종목 리스트 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-blue-600" />
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">보유 종목 현황 ({filteredHoldings.length})</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-slate-200" size={32} />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">자산 데이터를 불려오고 있습니다...</p>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-5">
              <AlertCircle size={40} className="text-slate-100" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">등록된 보유 종목이 없습니다</p>
            </div>
          ) : (
            filteredHoldings.map((h, i) => {
              const current = h.currentPrice || h.avgPrice;
              const profit = (current - h.avgPrice) * h.quantity;
              const rate = ((current - h.avgPrice) / h.avgPrice) * 100;
              const isPlus = profit >= 0;

              // 대응 게이지 계산 (목표가/손절가 대비 현재가 위치)
              // targetPrice와 stopLossPrice가 있을 때만 계산
              let gaugeProgress = 50;
              let gaugeLabel = "관망";
              let gaugeColor = "bg-slate-200";

              if (h.targetPrice && h.stopLossPrice && h.targetPrice > h.stopLossPrice) {
                const totalRange = h.targetPrice - h.stopLossPrice;
                const currentFromStop = Math.max(0, current - h.stopLossPrice);
                gaugeProgress = Math.min(100, (currentFromStop / totalRange) * 100);

                if (gaugeProgress >= 90) { gaugeLabel = "🎯 목표가 도달 임박"; gaugeColor = "bg-red-500"; }
                else if (gaugeProgress <= 10) { gaugeLabel = "⚠️ 손절선 이탈 위험"; gaugeColor = "bg-blue-500"; }
                else { gaugeLabel = "유지"; gaugeColor = "bg-blue-400"; }
              }

              return (
                <div key={`${h.itemCode}-${i}`} className="bg-white border border-slate-100 rounded-none overflow-hidden hover:border-blue-200 transition-all group">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center text-[11px] font-black uppercase">
                          {h.category}
                        </div>
                        <div>
                          <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{h.stockName}</h4>
                          <p className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">{h.itemCode}</p>
                        </div>
                      </div>
                      <button onClick={() => removeHolding(h.itemCode)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-slate-50 border border-slate-50 mb-6">
                      <div className="bg-white p-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">매수평균 / 수량</p>
                        <p className="text-sm font-black text-slate-900 tabular-nums">{h.avgPrice.toLocaleString()}원 / {h.quantity}주</p>
                      </div>
                      <div className="bg-white p-4 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">현재가</p>
                        <p className="text-sm font-black text-slate-900 tabular-nums">{current.toLocaleString()}원</p>
                      </div>
                      <div className="bg-white p-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">평균 수익률</p>
                        <span className={`text-sm font-black tabular-nums ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                          {isPlus ? '+' : ''}{rate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="bg-white p-4 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">수익금</p>
                        <span className={`text-sm font-black tabular-nums ${isPlus ? 'text-red-500' : 'text-blue-500'}`}>
                          {profit.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    {/* 타이밍 게이지 UI */}
                    <div className="bg-slate-50 p-5 rounded-none border border-slate-100">
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Target size={12} className="text-blue-600" /> TIMING GAUGE
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 ${gaugeColor} text-white`}>{gaugeLabel}</span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-200 rounded-none overflow-hidden mb-3">
                          <div className={`h-full ${gaugeColor} transition-all duration-1000`} style={{ width: `${gaugeProgress}%` }}></div>
                       </div>
                       <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest">
                          <span>STOP: {h.stopLossPrice?.toLocaleString()}원</span>
                          <span>GOAL: {h.targetPrice?.toLocaleString()}원</span>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-[450px] rounded-none p-10 border-t-8 border-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">자산 추가</h2>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">냉철한 수익 관리를 위한 첫걸음</p>
               </div>
               <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-900 text-white p-2 rounded-none"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddHolding} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">종목코드</label>
                     <input type="text" required placeholder="005930" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold outline-none focus:border-blue-600"
                        value={formData.itemCode} onChange={e => setFormData({...formData, itemCode: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">종목명</label>
                     <input type="text" required placeholder="삼성전자" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold outline-none focus:border-blue-600"
                        value={formData.stockName} onChange={e => setFormData({...formData, stockName: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">평균 매수가</label>
                     <input type="number" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold outline-none focus:border-blue-600"
                        value={formData.avgPrice} onChange={e => setFormData({...formData, avgPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">보유 수량</label>
                     <input type="number" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold outline-none focus:border-blue-600"
                        value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">전략 분류</label>
                  <div className="flex gap-2">
                     {['단기', '스윙', '장기'].map(c => (
                        <button key={c} type="button" onClick={() => setFormData({...formData, category: c})}
                           className={`flex-1 py-4 text-[10px] font-black border transition-all ${formData.category === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                           {c}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">🎯 익절 목표가</label>
                     <input type="number" required className="w-full bg-blue-50 border border-blue-100 p-4 rounded-none font-black outline-none focus:border-blue-600 text-blue-900"
                        value={formData.targetPrice} onChange={e => setFormData({...formData, targetPrice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">⚠️ 기계적 손절가</label>
                     <input type="number" required className="w-full bg-red-50 border border-red-100 p-4 rounded-none font-black outline-none focus:border-red-600 text-red-900"
                        value={formData.stopLossPrice} onChange={e => setFormData({...formData, stopLossPrice: e.target.value})} />
                  </div>
               </div>

               <button className="w-full bg-slate-900 text-white font-black py-6 rounded-none uppercase tracking-[0.2em] text-xs mt-6 hover:bg-blue-600 transition-all shadow-xl">
                  포트폴리오 자산 등록
               </button>
            </form>
          </div>
        </div>
      )}

      {/* AI 진단 모달 */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-950/90" onClick={() => !isAiLoading && setIsAnalysisModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[500px] rounded-none p-12 border-4 border-slate-900 shadow-2xl">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                   <Bot className="text-blue-600" /> AI 종목 진단 리포트
                 </h2>
                 <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>

              <div className="min-h-[400px]">
                 {isAiLoading ? (
                   <div className="py-40 flex flex-col items-center justify-center gap-6">
                      <Sparkles size={50} className="text-blue-600 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse">퀀트 엔진 분석 중...</p>
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-10 border-l-8 border-blue-600 animate-in fade-in slide-in-from-bottom-4">
                      <p className="text-[15px] font-bold text-slate-800 leading-relaxed tracking-tight whitespace-pre-wrap">{aiAnalysis}</p>
                      <div className="mt-12 pt-8 border-t border-slate-200">
                         <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                           <ShieldAlert size={14} className="text-blue-500" /> 감정에 휘둘리지 않는 기계적 매매가 핵심입니다
                         </p>
                      </div>
                   </div>
                 )}
              </div>

              <button onClick={() => setIsAnalysisModalOpen(false)} className="w-full bg-slate-900 text-white font-black py-6 rounded-none mt-12 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all">
                 분석 결과 확인 완료
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
