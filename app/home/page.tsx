"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Globe, Zap } from 'lucide-react';

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
  success: boolean;
}

export default function HomePage() {
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMarketIndices = async () => {
    try {
      const res = await fetch('/api/market');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMarketIndices(data);
      }
    } catch (error) {
      console.error("Market fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
    const interval = setInterval(fetchMarketIndices, 60000); // 1분마다 업데이트
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-36 font-sans overflow-x-hidden p-8">
      {/* Welcome Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Market Morning Brief</span>
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-2">
          안녕하세요, <span className="text-blue-500 italic">게스트</span> 투자자님! 👋
        </h2>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">
          오늘의 시장 흐름을 한눈에 파악하고<br />
          보유 종목의 변동성을 확인해 보세요.
        </p>
      </div>
      
      {/* Market Indices Section (Real-time Integration) */}
      <div className="flex gap-4 mb-10">
        {isLoading && marketIndices.length === 0 ? (
          <>
            <div className="flex-1 h-28 bg-slate-800/40 rounded-[2.5rem] animate-pulse"></div>
            <div className="flex-1 h-28 bg-slate-800/40 rounded-[2.5rem] animate-pulse"></div>
          </>
        ) : (
          marketIndices.map(market => {
            const isUp = market.changePercent >= 0;
            return (
              <div key={market.symbol} className="flex-1 p-6 rounded-[2.5rem] bg-slate-800/40 border border-white/5 relative overflow-hidden group shadow-xl transition-all duration-300">
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-10 transition-all duration-700 ${isUp ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{market.name}</span>
                  {isUp ? <ArrowUpRight size={14} className="text-red-500" /> : <ArrowDownRight size={14} className="text-blue-400" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-100 tracking-tight">
                    {market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-xs font-black ${isUp ? 'text-red-500' : 'text-blue-400'}`}>
                    {isUp ? '+' : ''}{market.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Intelligence Card */}
      <div className="relative p-7 rounded-[2.5rem] bg-gradient-to-br from-blue-600/20 via-blue-900/10 to-transparent border border-blue-500/20 shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={80} />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Sparkles size={16} />
          </div>
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-tighter">AI Market Insight</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-medium mb-6">
          "오늘 국내 증시는 반도체 업종의 강세로 코스피가 상승 출발했습니다. 
          외국인의 순매수 규모를 주시하며 변동성에 유의하시기 바랍니다. 
          특히 보유 중인 삼성전자의 수급 개선 신호가 포착되었습니다."
        </p>
        <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-[0.98]">
          상세 리포트 읽기
        </button>
      </div>

      {/* External Info Tiles */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2rem] flex flex-col gap-4 group cursor-pointer hover:bg-slate-800/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
            <Globe size={18} />
          </div>
          <p className="text-xs font-black text-slate-200 uppercase tracking-tighter">Global Market</p>
        </div>
        <div className="p-6 bg-slate-800/40 border border-white/5 rounded-[2rem] flex flex-col gap-4 group cursor-pointer hover:bg-slate-800/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
            <TrendingUp size={18} />
          </div>
          <p className="text-xs font-black text-slate-200 uppercase tracking-tighter">Top Gainers</p>
        </div>
      </div>
    </div>
  );
}
