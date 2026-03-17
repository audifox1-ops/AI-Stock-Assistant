"use client";

import React, { useState, useEffect } from 'react';
import { 
  PieChart, Wallet, TrendingUp, TrendingDown, Plus, X, Search, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity, Target,
  Bot, Sparkles, Loader2, ShieldAlert
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
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
      setHoldings(JSON.parse(saved));
    }
    setIsLoading(false);
  }, []);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const holding: Holding = {
      id: Date.now().toString(),
      itemCode: newStock.itemCode,
      stockName: newStock.stockName,
      avgPrice: Number(newStock.avgPrice),
      quantity: Number(newStock.quantity),
      currentPrice: Number(newStock.avgPrice), // 초기값은 평단가로 설정
      position: newStock.position
    };

    const updated = [...holdings, holding];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    setNewStock({ itemCode: '', stockName: '', avgPrice: '', quantity: '', position: '단기' });
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

  const totalInvestment = holdings.reduce((acc, h) => acc + (h.avgPrice * h.quantity), 0);
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
      {/* 헤더 - [21차] 한글화 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50 rounded-none">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">내 보유 주식</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">실시간 자산 포트폴리오</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 text-white p-3 rounded-none active:bg-blue-600 transition-all border border-slate-900"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-6">
        {/* 요약 카드 - [21차] 한글화 */}
        <div className="bg-slate-900 p-8 rounded-none shadow-none relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">총 투자 금액</p>
            <h2 className="text-3xl font-black text-white tabular-nums tracking-tighter">
              {totalInvestment.toLocaleString()}원
            </h2>
            <div className="flex items-center gap-3 mt-4">
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-none border border-blue-500/30 uppercase">전략적 자산 운용 중</span>
            </div>
          </div>
          <PieChart className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32" />
        </div>

        {/* AI 진단 버튼 - [21차] 한글화 */}
        <button 
          onClick={handleAiDiagnosis}
          disabled={holdings.length === 0}
          className="w-full bg-white border-2 border-blue-600 p-6 rounded-none flex items-center justify-center gap-3 active:bg-blue-50 transition-all disabled:opacity-50 disabled:grayscale"
        >
          <Bot size={24} className="text-blue-600" />
          <span className="text-[13px] font-black text-blue-600 uppercase tracking-widest">🤖 내 계좌 AI 종합 진단받기</span>
        </button>

        {/* 필터 탭 - [21차] 한글화 */}
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

        {/* 종목 리스트 - [21차] 한글화 */}
        <div className="space-y-4">
          {filteredHoldings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 p-16 text-center rounded-none">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">등록된 보유 종목이 없습니다</p>
            </div>
          ) : (
            filteredHoldings.map((h) => (
              <div key={h.id} className="bg-white p-7 rounded-none border border-slate-100 flex justify-between items-center group relative overflow-hidden active:bg-slate-50 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 uppercase text-[10px] font-black text-slate-400">
                    {h.position}
                  </div>
                  <div>
                    <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase">{h.stockName}</h4>
                    <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">{h.itemCode} | {h.quantity}주</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[16px] font-black text-slate-900 tabular-nums">{(h.avgPrice * h.quantity).toLocaleString()}원</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1">평단 {h.avgPrice.toLocaleString()}원</p>
                  </div>
                  <button onClick={() => removeHolding(h.id)} className="p-2.5 bg-slate-50 text-slate-200 hover:text-red-500 transition-colors border border-slate-100 rounded-none active:scale-90">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 등록 모달 - [21차] 한글화 */}
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
                <input 
                  type="text" required placeholder="종목 정보 입력"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-none font-bold text-slate-900 outline-none focus:border-blue-600 transition-all uppercase"
                  value={newStock.stockName} onChange={e => setNewStock({...newStock, stockName: e.target.value, itemCode: '000000'})}
                />
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

      {/* AI 진단 모달 - [21차] 한글화 */}
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
