"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Wallet, BarChart3, Bot, Sparkles, Loader2, HelpCircle, Info, ChevronRight, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Stock {
  id: string | number;
  symbol: string;
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  changePercent?: number;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (e) {}
  };

  const fetchHoldings = async () => {
    try {
      const { data } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (data) {
        setStocks(data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity)
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async () => {
    const symbols = stocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent 
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  const runAnalysis = async (stock: Stock) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.currentPrice || stock.avgPrice,
          changePercent: stock.changePercent || 0
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("네트워크 상태를 확인해 주세요.");
    } finally { setIsAiLoading(false); }
  };

  useEffect(() => {
    fetchMarket();
    fetchHoldings();
    const interval = setInterval(() => {
      fetchMarket();
      fetchPrices();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if(stocks.length > 0) fetchPrices(); }, [stocks.length]);

  const totalCurrent = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuy = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalRate = totalBuy > 0 ? ((totalCurrent / totalBuy - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="w-full pb-20">
      <header className="px-5 py-6 bg-white flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} /> AI-Stock
        </h1>
        <button onClick={() => { fetchMarket(); fetchPrices(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400 active:rotate-180 transition-transform duration-500">
           <RefreshCcw className={isRefreshing ? 'animate-spin text-blue-500' : ''} size={18} />
        </button>
      </header>

      <div className="px-5 mt-4 space-y-6">
        {/* [5차 핵심] 온보딩 배너 */}
        {showBanner && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
             <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 opacity-60 hover:opacity-100">
                <X size={18} />
             </button>
             <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                   <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-base">AI-Stock 시작하기</h4>
             </div>
             <p className="text-sm text-blue-50 font-medium leading-snug mb-4">
                관심 종목을 추가하고 실시간 AI 투자 전략과 정밀 차트 분석을 무료로 받아보세요!
             </p>
             <Link href="/watchlist" className="inline-flex items-center gap-1.5 bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-50 transition-colors">
                관심 종목 추가하러 가기 <ChevronRight size={14} />
             </Link>
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        )}

        {/* 시장 지수 */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.map(m => (
             <div key={m.symbol} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
                <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                   {m.name}
                   <HelpCircle size={12} className="opacity-40 cursor-pointer" onClick={() => setActiveTooltip(activeTooltip === m.symbol ? null : m.symbol)} />
                </p>
                {activeTooltip === m.symbol && (
                   <div className="absolute mt-6 bg-slate-800 text-white text-[9px] p-2 rounded-lg z-50 animate-in fade-in duration-200 shadow-xl">
                      주차별 시장 평균 등락을 나타내는 주요 지수 정보입니다.
                   </div>
                )}
                <div className="flex justify-between items-end">
                   <h2 className={`text-xl font-bold ${m.changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{m.price.toLocaleString()}</h2>
                   <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${m.changePercent >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {m.changePercent >= 0 ? '+' : ''}{m.changePercent.toFixed(1)}%
                   </span>
                </div>
             </div>
           ))}
        </section>

        {/* 자산 상태 요약 */}
        <section className="bg-white p-7 rounded-[1.5rem] border border-gray-100 shadow-sm transition-all hover:border-blue-100">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-slate-400 opacity-80">
                 <Wallet size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">My Portfolio</span>
              </div>
              <Info size={14} className="text-slate-200 cursor-pointer" onClick={() => setActiveTooltip(activeTooltip === 'assets' ? null : 'assets')} />
           </div>
           {activeTooltip === 'assets' && (
              <div className="absolute right-10 bg-slate-800 text-white text-[10px] p-3 rounded-xl z-50 mb-4 shadow-xl w-48 animate-in slide-in-from-right-2 duration-200">
                 현재 보유 중인 주식의 실시간 총 가치와 투자 원금 대비 수익률을 계산합니다.
              </div>
           )}
           <div className="flex items-baseline gap-3 mb-6">
              <h2 className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{totalCurrent.toLocaleString()}원</h2>
              <p className={`text-sm font-bold px-2 py-0.5 rounded-full ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
           </div>
           <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5">총 수익</p>
                 <p className={`text-base font-bold ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5">투자 원금</p>
                 <p className="text-base font-bold text-slate-900">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI 인사이트 섹션 - 가독성 및 도움말 강화 */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={20} /> AI 투자 인사이트
                <HelpCircle size={16} className="text-slate-200 cursor-pointer" onClick={() => setActiveTooltip(activeTooltip === 'ai' ? null : 'ai')} />
              </h3>
              {activeTooltip === 'ai' && (
                <div className="absolute mt-12 bg-slate-800 text-white text-[10px] p-3 rounded-xl z-50 shadow-xl w-52 border border-slate-700">
                   AI가 종목별 매수 세력의 강도와 차트 패턴을 정밀 분석하여 3개의 문단으로 핵심만 요약해 드립니다.
                </div>
              )}
           </div>
           <div className="bg-blue-50 rounded-2xl p-6 text-gray-800 shadow-sm border border-blue-100 flex flex-col justify-center min-h-[180px] relative overflow-hidden group">
              {isAiLoading ? (
                <div className="text-center flex flex-col items-center gap-3">
                   <Loader2 className="animate-spin text-blue-400" size={32} />
                   <p className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Consulting AI...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in duration-700">
                   <div className="px-2 py-0.5 bg-blue-500 text-white rounded-md text-[9px] font-black w-fit mb-4 uppercase tracking-widest">AI Report</div>
                   {/* [5차 핵심] whitespace-pre-wrap 및 줄바꿈 적용 */}
                   <p className="text-[15px] font-bold leading-relaxed text-slate-700 whitespace-pre-wrap italic opacity-90">
                      {aiAnalysis}
                   </p>
                </div>
              ) : (
                <div className="text-center py-6">
                   <Bot size={44} className="mx-auto mb-4 text-blue-100 group-hover:scale-110 transition-transform" />
                   <p className="text-sm font-bold text-slate-400">분석할 종목을 터치하여<br/>AI 전략을 받아보세요.</p>
                </div>
              )}
           </div>
        </section>

        {/* 내 주식 리스트 - 애플 스타일 플랫 디자인 */}
        <section className="space-y-4 pb-10">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-slate-900">내 주식</h3>
              <span className="text-[10px] font-bold text-slate-300">Total {stocks.length} Items</span>
           </div>
           <div className="space-y-3">
              {stocks.map(s => {
                const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                const isProfit = parseFloat(profitRate) >= 0;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => { setSelectedStock(s); runAnalysis(s); }} 
                    className="w-full flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-all hover:translate-y-[-2px] active:scale-[0.98] group"
                  >
                     <div className="flex flex-col gap-0.5">
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{s.name}</h4>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">{s.symbol} · {s.quantity}주</span>
                     </div>
                     <div className="text-right flex flex-col items-end gap-1.5">
                        <p className="text-xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">{(s.currentPrice || s.avgPrice).toLocaleString()}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                           {isProfit ? '+' : ''}{profitRate}%
                        </span>
                     </div>
                  </div>
                );
              })}
           </div>
        </section>
      </div>
    </div>
  );
}
