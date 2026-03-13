"use client";

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Target, 
  ShieldAlert,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface AiAnalysisResult {
  position: string;
  action: string;
  targetPrice: number;
  reason: string;
}

interface Stock {
  id: number;
  name: string;
  avgPrice: number;
  currentPrice: number;
  quantity: number;
  type: '단기' | '스윙' | '장기';
  target: number;
  stopLoss: number;
  supplyTrend: string;
  analysis?: AiAnalysisResult;
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([
    { id: 1, name: '삼성전자', avgPrice: 72000, currentPrice: 75200, quantity: 100, type: '장기', target: 90000, stopLoss: 68000, supplyTrend: '외국인 순매수세 지속' },
    { id: 2, name: 'SK하이닉스', avgPrice: 150000, currentPrice: 162000, quantity: 50, type: '스윙', target: 185000, stopLoss: 140000, supplyTrend: '기관 대량 매집 중' },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedStockId, setExpandedStockId] = useState<number | null>(null);
  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '',
    avgPrice: 0,
    quantity: 0,
    type: '스윙',
    target: 0,
    stopLoss: 0,
    supplyTrend: '수급 분석 대기 중'
  });

  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});

  const calculateProfit = (stock: Stock) => {
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2);
    return { profit, rate, isPositive: profit >= 0 };
  };

  const handleAddStock = () => {
    if (!newStock.name || !newStock.avgPrice) return;
    
    const stockToAdd: Stock = {
      id: Date.now(),
      name: newStock.name,
      avgPrice: Number(newStock.avgPrice),
      currentPrice: Number(newStock.avgPrice),
      quantity: Number(newStock.quantity),
      type: newStock.type as '단기' | '스윙' | '장기',
      target: Number(newStock.target),
      stopLoss: Number(newStock.stopLoss),
      supplyTrend: newStock.supplyTrend || '신규 등록 종목'
    };

    setStocks([stockToAdd, ...stocks]);
    setIsAddModalOpen(false);
    setNewStock({ name: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0, supplyTrend: '수급 분석 대기 중' });
  };

  const analyzeStock = async (stock: Stock) => {
    // 이미 결과가 있고 펼쳐져 있다면 닫기만 함
    if (stock.analysis && expandedStockId === stock.id) {
      setExpandedStockId(null);
      return;
    }

    // 결과가 이미 있다면 분석 없이 펼치기만 함
    if (stock.analysis) {
      setExpandedStockId(stock.id);
      return;
    }

    setLoadingAi(prev => ({ ...prev, [stock.id]: true }));
    try {
      const { rate } = calculateProfit(stock);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stock.name,
          currentPrice: stock.currentPrice,
          rate: rate,
          supplyTrend: stock.supplyTrend
        })
      });
      const data = await res.json();
      
      setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, analysis: data } : s));
      setExpandedStockId(stock.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAi(prev => ({ ...prev, [stock.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-32 font-sans overflow-x-hidden">
      {/* Header Summary */}
      <div className="p-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-heading font-black bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">
            내 자산 현황
          </h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
          <p className="text-slate-500 text-xs mb-1 font-black uppercase tracking-widest">실시간 총 평가 손익</p>
          <div className="flex items-baseline gap-2 mb-6">
            <h2 className="text-4xl font-black text-red-500 tracking-tight">
              +4,250,500원
            </h2>
            <span className="text-red-500 text-lg font-black">+5.24%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">평가 금액</p>
              <p className="text-lg font-bold">82.4M</p>
            </div>
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">매수 금액</p>
              <p className="text-lg font-bold">78.2M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="px-8 space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-lg text-slate-200 font-heading">보유 종목 ({stocks.length})</h3>
          <div className="flex gap-2">
            <button className="px-5 py-2 rounded-full bg-slate-800 text-slate-400 text-xs font-black border border-white/5 hover:bg-slate-700 transition-all">필터</button>
          </div>
        </div>

        {stocks.map(stock => {
          const { profit, rate, isPositive } = calculateProfit(stock);
          const isExpanded = expandedStockId === stock.id;
          const badgeColors = {
            '장기': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            '스윙': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            '단기': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          };

          return (
            <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/60 transition-all duration-300 shadow-xl relative overflow-hidden">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-xl font-black text-slate-100">{stock.name}</h4>
                    <span className={`text-[10px] px-3 py-1 rounded-full border font-black tracking-tighter ${badgeColors[stock.type]}`}>
                      {stock.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">{stock.quantity}주 · 평단 {stock.avgPrice.toLocaleString()}원</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1 font-black text-xl ${isPositive ? 'text-red-500' : 'text-blue-400'}`}>
                    {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    {rate}%
                  </div>
                  <p className={`text-xs font-bold ${isPositive ? 'text-red-500/70' : 'text-blue-400/70'}`}>
                    {isPositive ? '+' : ''}{profit.toLocaleString()}원
                  </p>
                </div>
              </div>

              {/* Targets */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                  <Target size={18} className="text-red-500/70" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-600 font-black uppercase">TP</span>
                    <span className="text-base font-black text-red-500">{stock.target.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                  <ShieldAlert size={18} className="text-blue-500/70" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-600 font-black uppercase">SL</span>
                    <span className="text-base font-black text-blue-400">{stock.stopLoss.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis Button */}
              <button 
                onClick={() => analyzeStock(stock)}
                disabled={loadingAi[stock.id]}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden relative group ${
                  isExpanded ? 'bg-slate-700/50 border border-white/10 text-slate-300' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                {loadingAi[stock.id] ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AI 전략 분석 중...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={18} className={isExpanded ? "text-blue-400" : "text-white animate-pulse"} />
                    <span>{isExpanded ? "분석 결과 접기" : "Gemini AI 전략 분석"}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </>
                )}
              </button>

              {/* AI Result Accordion (Expanded Area) */}
              <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                {stock.analysis && (
                  <div className="bg-slate-900/60 rounded-[2rem] border border-blue-500/20 p-6 shadow-inner relative overflow-hidden group/analysis">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Sparkles size={120} className="text-blue-500" />
                    </div>
                    
                    <div className="flex gap-3 mb-6 relative">
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">포지션</p>
                        <span className="text-sm font-black text-blue-400">{stock.analysis.position}</span>
                      </div>
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                        <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">권장 행동</p>
                        <span className={`text-sm font-black px-3 py-1 rounded-full ${
                          stock.analysis.action === '추매' ? 'bg-red-500/20 text-red-500' : 
                          stock.analysis.action === '손절' ? 'bg-blue-500/20 text-blue-500' : 
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {stock.analysis.action}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6 relative">
                      <p className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest">AI 적정 목표가</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-red-500">{stock.analysis.targetPrice.toLocaleString()}원</span>
                        <span className="text-xs text-slate-600 font-bold">중기 관점</span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start relative overflow-hidden">
                      <div className="mt-1">
                        <AlertCircle size={16} className="text-blue-500 animate-pulse" />
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {stock.analysis.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center Centered High-Fidelity Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl shadow-blue-500/10 animate-in zoom-in-95 duration-500 relative">
            <div className="flex justify-between items-center mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">New Investment</span>
                <h2 className="text-2xl font-black font-heading text-slate-100">종목 신규 등록</h2>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-12 h-12 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/10 transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="group space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">종목명</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newStock.name}
                    onChange={e => setNewStock({...newStock, name: e.target.value})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none transition-all font-bold text-slate-100"
                    placeholder="삼성전자를 입력하세요"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">매수가 (원)</label>
                  <input 
                    type="number" 
                    value={newStock.avgPrice || ''}
                    onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none transition-all font-bold text-slate-100"
                    placeholder="75,000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">보유수량</label>
                  <input 
                    type="number" 
                    value={newStock.quantity || ''}
                    onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none transition-all font-bold text-slate-100"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">투자 성향</label>
                <div className="flex gap-2 p-1 bg-slate-800 border border-white/5 rounded-2xl">
                  {['단기', '스윙', '장기'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNewStock({...newStock, type: t as any})}
                      className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                        newStock.type === t 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-5 rounded-2xl bg-slate-800 border border-white/5 text-slate-400 font-black transition-all hover:bg-slate-700 active:scale-[0.97]"
                >
                  취소
                </button>
                <button 
                  onClick={handleAddStock}
                  className="flex-[2] py-5 rounded-2xl bg-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-600 transition-all"
                >
                  <Check size={24} />
                  <span>등록 완료</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
