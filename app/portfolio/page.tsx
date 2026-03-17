"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, ChevronRight, Loader2, AlertCircle,
  BarChart3, PieChart, Info, X, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCcw,
  Bot, Sparkles, ShieldAlert, Target, Zap, Clock, ListFilter
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// [17차 핵심] localStorage 키 및 인터페이스 확장
const PORTFOLIO_STORAGE_KEY = 'myPortfolio';

interface Holding {
  id: string | number;
  stock_code: string;
  stock_name: string;
  avg_buy_price: number;
  quantity: number;
  last_price: number | null;
  position: '단기' | '스윙' | '장기'; // [17차] 신규 필드
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // [17차] 필터링 탭 상태
  const [activeSubTab, setActiveSubTab] = useState<'전체' | '단기' | '스윙' | '장기'>('전체');

  // 모달 및 AI 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ name: '', price: '', quantity: '', position: '스윙' as '단기' | '스윙' | '장기' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 데이터 로드 (localStorage)
  const loadHoldings = () => {
    setIsRefreshing(true);
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        // [17차 에러 방어 로직] 포지션 정보가 없는 기존 데이터 '스윙'으로 자동 보정
        const validated = parsed.map((h: any) => ({
          ...h,
          position: h.position || '스윙'
        }));
        setHoldings(validated);
        // 실시간 시세 업데이트 호출
        updateLivePrices(validated);
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

  // 실시간 시세 연동 (네이버 API 프록시 활용)
  const updateLivePrices = async (currentHoldings: Holding[]) => {
    if (currentHoldings.length === 0) return;
    try {
      // 실제 앱에서는 여기서 각 종목의 현재가를 가져오는 API를 호출합니다.
      // 여기서는 UI 시연을 위해 기존 API를 활용하거나 임의 지표를 유지합니다.
      // (기존 route.ts 기반 시세 연동 로직 포함 가능)
    } catch (e) {}
  };

  useEffect(() => {
    loadHoldings();
  }, []);

  // 종목 추가 저장 로직 (localStorage)
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
      last_price: parseFloat(newStock.price), // 초기값은 평단가로 설정
      position: newStock.position
    };

    const updated = [newItem, ...holdings];
    setHoldings(updated);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
    
    setIsSubmitting(false);
    setIsAddModalOpen(false);
    setNewStock({ name: '', price: '', quantity: '', position: '스윙' });
  };

  // AI 종합 진단 호출 로직
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
      setAiDiagnosis("AI 진단 시스템 연결 실패. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 탭 필터링 로직
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
        <p className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">Syncing Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-32">
      {/* 헤더 */}
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-50">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Portfolio</h1>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Institutional Asset Management</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
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
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Global Asset Balance</span>
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

        {/* [17차 핵심] 🤖 내 계좌 AI 종합 진단 버튼 */}
        <button 
          onClick={fetchAiDiagnosis}
          className="w-full bg-slate-900 text-white p-7 rounded-[2.25rem] shadow-2xl shadow-slate-200 flex items-center justify-between group active:scale-[0.98] transition-all overflow-hidden relative"
        >
           <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                 <Bot size={24} className="text-blue-400" />
              </div>
              <div className="text-left">
                 <p className="text-base font-black uppercase tracking-widest leading-none">내 계좌 AI 종합 진단</p>
                 <p className="text-[10px] text-white/50 font-bold mt-1.5 uppercase tracking-widest">AI Fund Manager Analysis</p>
              </div>
           </div>
           <Sparkles size={20} className="text-blue-400 group-hover:rotate-12 transition-transform" />
        </button>

        {/* [17차 핵심] 투자 포지션 서브 탭 (Pill 형태) */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2">
           {['전체', '단기', '스윙', '장기'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveSubTab(tab as any)}
               className={`flex-shrink-0 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                 activeSubTab === tab 
                 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                 : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        {/* 보유 종목 리스트 */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <ListFilter size={16} className="text-blue-500" /> {activeSubTab} Asset List
              </h3>
              <button onClick={loadHoldings} className="text-slate-300 hover:text-blue-500">
                <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
           </div>

           {filteredHoldings.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-200">
                   <Wallet size={32} />
                </div>
                <p className="text-sm font-bold text-slate-300 leading-relaxed uppercase tracking-widest">
                   해당 그룹에 보유 항목이 없습니다.<br/>우측 상단 + 버튼을 눌러 추가하세요.
                </p>
             </div>
           ) : (
             filteredHoldings.map(h => {
               const current = h.last_price || h.avg_buy_price;
               const profit = (current - h.avg_buy_price) * h.quantity;
               const rate = ((current / h.avg_buy_price - 1) * 100).toFixed(2);
               const isUp = parseFloat(rate) >= 0;

               return (
                 <div key={h.id} className="bg-white p-7 rounded-[2.25rem] shadow-sm border border-gray-100 hover:border-blue-100 transition-all group active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-colors ${
                            h.position === '단기' ? 'bg-orange-50 text-orange-600' :
                            h.position === '스윙' ? 'bg-blue-50 text-blue-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                             {h.position}
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

      {/* Add Holding Modal [17차 포지션 선택 필드 추가] */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300 pb-16">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add Strategic Asset</h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
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
                 
                 {/* [17차] 투자 포지션 선택 항목 */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Investment Position</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['단기', '스윙', '장기'].map((pos) => (
                         <button
                           key={pos}
                           type="button"
                           onClick={() => setNewStock({ ...newStock, position: pos as any })}
                           className={`py-4 rounded-xl text-xs font-black transition-all ${
                             newStock.position === pos 
                             ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                             : 'bg-slate-50 text-slate-400'
                           }`}
                         >
                           {pos}
                         </button>
                       ))}
                    </div>
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
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Confirm & Save Asset'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* [17차] AI 종합 진단 결과 모달 */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl" onClick={() => !isAiLoading && setIsAiModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[460px] rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-400 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                       <Bot size={24} className="text-white" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Account Diagnosis</h2>
                       <p className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-[0.2em]">Wall Street AI Fund Manager</p>
                    </div>
                 </div>
                 <button onClick={() => setIsAiModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-2 min-h-[300px]">
                 {isAiLoading ? (
                   <div className="h-full flex flex-col items-center justify-center py-20 gap-6">
                      <div className="relative">
                         <Loader2 className="animate-spin text-blue-600" size={56} />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles size={24} className="text-blue-600" />
                         </div>
                      </div>
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">
                         사용자 자산 정밀 분석 중...<br/>매매 타이밍 및 수급 진단 데이터를 통합하고 있습니다.
                      </p>
                   </div>
                 ) : (
                   <div className="animate-in fade-in slide-in-from-bottom-8 duration-800 space-y-6">
                      <div className="bg-blue-50/50 rounded-[2.5rem] p-10 border border-blue-100/50 shadow-inner">
                         <div className="whitespace-pre-wrap leading-[1.9] text-slate-800 font-bold text-[15px] tracking-tight">
                            {aiDiagnosis}
                         </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-[2rem] flex items-center gap-4">
                         <ShieldAlert className="text-blue-500 flex-shrink-0" size={24} />
                         <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                            본 진단은 AI 모델의 알고리즘에 기반한 것으로 투자 결과에 대한 법적 책임을 지지 않습니다. 최종 판단은 본인에게 있습니다.
                         </p>
                      </div>
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button onClick={() => setIsAiModalOpen(false)} className="w-full bg-slate-900 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-slate-200 mt-8 uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all flex-shrink-0">
                   전략 확인 및 닫기
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
