"use client";

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Target, 
  ShieldAlert,
  Search
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
  const [stocks, setStocks] = useState<Stock[]>([
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
    <div className="min-h-screen bg-navy-950 text-slate-100 pb-24">
      {/* Header Summary */}
      <div className="p-6 bg-gradient-to-b from-navy-900 to-navy-950">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            내 자산 현황
          </h1>
          <button className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700 flex items-center justify-center text-accent-primary hover:bg-navy-700 transition-colors">
            <Plus size={24} />
          </button>
        </div>

        <div className="bg-navy-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
          <p className="text-slate-400 text-sm mb-1">총 평가 손익</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-3xl font-bold text-stock-up">
              +4,250,500원
            </h2>
            <span className="text-stock-up text-lg font-semibold">+5.24%</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/5">
              <p className="text-xs text-slate-500 mb-1">평가 금액</p>
              <p className="font-semibold">82,450,000원</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/5">
              <p className="text-xs text-slate-500 mb-1">매수 금액</p>
              <p className="font-semibold">78,200,000원</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="px-6 space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-semibold text-slate-300">보유 종목 ({stocks.length})</h3>
          <div className="flex gap-2 text-xs">
            <button className="px-3 py-1 rounded-full bg-accent-primary/20 text-accent-primary">전체</button>
            <button className="px-3 py-1 rounded-full text-slate-500">수익순</button>
          </div>
        </div>

        {stocks.map(stock => {
          const { profit, rate, isPositive } = calculateProfit(stock);
          const badgeColors = {
            '장기': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            '스윙': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            '단기': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          };

          return (
            <div key={stock.id} className="bg-navy-900/40 border border-white/5 rounded-3xl p-5 hover:bg-navy-900/60 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold">{stock.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${badgeColors[stock.type]}`}>
                      {stock.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{stock.quantity}주 · 평단 {stock.avgPrice.toLocaleString()}원</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1 font-bold text-lg ${isPositive ? 'text-stock-up' : 'text-stock-down'}`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {rate}%
                  </div>
                  <p className={`text-xs font-medium ${isPositive ? 'text-stock-up/70' : 'text-stock-down/70'}`}>
                    {isPositive ? '+' : ''}{profit.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 bg-navy-950/50 rounded-xl p-2.5 border border-white/5">
                  <Target size={14} className="text-slate-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 leading-none mb-1">목표가</span>
                    <span className="text-sm font-semibold text-stock-up">{stock.target.toLocaleString()}원</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-navy-950/50 rounded-xl p-2.5 border border-white/5">
                  <ShieldAlert size={14} className="text-slate-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 leading-none mb-1">손절가</span>
                    <span className="text-sm font-semibold text-stock-down">{stock.stopLoss.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis Button */}
              <button 
                onClick={() => analyzeStock(stock)}
                disabled={loadingAi[stock.id]}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/20 flex items-center justify-center gap-2 text-accent-primary font-bold hover:from-accent-primary/20 hover:to-accent-secondary/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loadingAi[stock.id] ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>AI 분석 중...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={16} className="text-accent-primary fill-accent-primary/20" />
                    <span>Gemini Pro AI 분석하기</span>
                  </>
                )}
              </button>

              {/* AI Result Box */}
              {aiAnalysis[stock.id] && (
                <div className="mt-4 p-4 bg-navy-950/80 rounded-2xl border border-accent-primary/10 text-sm leading-relaxed text-slate-300 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-2 text-accent-primary font-bold text-xs">
                    <Sparkles size={12} />
                    <span>AI 분석 결과</span>
                  </div>
                  {aiAnalysis[stock.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
