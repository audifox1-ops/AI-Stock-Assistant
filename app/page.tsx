"use client";

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Target, 
  ShieldAlert
} from 'lucide-react';

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
}

export default function PortfolioPage() {
  const [stocks] = useState<Stock[]>([
    { id: 1, name: '삼성전자', avgPrice: 72000, currentPrice: 75200, quantity: 100, type: '장기', target: 90000, stopLoss: 68000, supplyTrend: '외국인 순매수세 지속' },
    { id: 2, name: 'SK하이닉스', avgPrice: 150000, currentPrice: 162000, quantity: 50, type: '스윙', target: 185000, stopLoss: 140000, supplyTrend: '기관 대량 매집 중' },
    { id: 3, name: '카카오', avgPrice: 52000, currentPrice: 48500, quantity: 200, type: '단기', target: 60000, stopLoss: 45000, supplyTrend: '기관 매도세 및 거래량 감소' },
  ]);

  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});
  const [aiAnalysis, setAiAnalysis] = useState<Record<number, string>>({});

  const calculateProfit = (stock: Stock) => {
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2);
    return { profit, rate, isPositive: profit >= 0 };
  };

  const analyzeStock = async (stock: Stock) => {
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
      setAiAnalysis(prev => ({ ...prev, [stock.id]: data.analysis }));
    } catch (error) {
      console.error(error);
      setAiAnalysis(prev => ({ ...prev, [stock.id]: "분석 중 오류가 발생했습니다." }));
    } finally {
      setLoadingAi(prev => ({ ...prev, [stock.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans">
      {/* Header Summary */}
      <div className="p-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">
            내 자산 현황
          </h1>
          <button className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-blue-500 shadow-xl hover:bg-slate-700 transition-all">
            <Plus size={24} />
          </button>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <p className="text-slate-400 text-sm mb-2 font-medium">총 평가 손익</p>
          <div className="flex items-baseline gap-2 mb-6">
            <h2 className="text-4xl font-bold text-red-500 tracking-tight">
              +4,250,500원
            </h2>
            <span className="text-red-500 text-xl font-bold">+5.24%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">평가 금액</p>
              <p className="text-lg font-bold">82,450,000원</p>
            </div>
            <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">매수 금액</p>
              <p className="text-lg font-bold">78,200,000원</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="px-8 space-y-5">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-lg text-slate-200 font-heading">보유 종목 ({stocks.length})</h3>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20">전체</button>
            <button className="px-4 py-1.5 rounded-full text-slate-500 text-xs font-bold">수익순</button>
          </div>
        </div>

        {stocks.map(stock => {
          const { profit, rate, isPositive } = calculateProfit(stock);
          const badgeColors = {
            '장기': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            '스윙': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            '단기': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          };

          return (
            <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2rem] p-6 hover:bg-slate-800/60 hover:border-blue-500/20 transition-all duration-300 group shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold text-slate-100">{stock.name}</h4>
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-black ${badgeColors[stock.type]}`}>
                      {stock.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{stock.quantity}주 · 평단 {stock.avgPrice.toLocaleString()}원</p>
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Target size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">목표가</span>
                    <span className="text-base font-bold text-red-500">{stock.target.toLocaleString()}원</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">손절가</span>
                    <span className="text-base font-bold text-blue-400">{stock.stopLoss.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis Button */}
              <button 
                onClick={() => analyzeStock(stock)}
                disabled={loadingAi[stock.id]}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center gap-3 text-blue-500 font-black hover:from-blue-500/20 hover:to-indigo-500/20 transition-all active:scale-[0.97] disabled:opacity-50 shadow-inner"
              >
                {loadingAi[stock.id] ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>AI 전략 분석 중...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={18} className="text-blue-500 fill-blue-500/20" />
                    <span>Gemini Pro AI 전략 보기</span>
                  </>
                )}
              </button>

              {/* AI Result Box */}
              {aiAnalysis[stock.id] && (
                <div className="mt-5 p-5 bg-slate-900/80 rounded-[1.5rem] border border-blue-500/10 text-sm leading-relaxed text-slate-300 animate-in fade-in slide-in-from-top-3 duration-500 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                  <div className="flex items-center gap-2 mb-3 text-blue-500 font-black text-xs uppercase tracking-widest">
                    <Sparkles size={14} />
                    <span>AI Analysis Insight</span>
                  </div>
                  <p className="font-medium underline decoration-blue-500/20 underline-offset-4">{aiAnalysis[stock.id]}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
