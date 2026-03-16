"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Wallet, BarChart3, Bot, Sparkles, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// [배포 에러 수정] Client Component에서는 Server Segment Config(revalidate)가 충돌을 일으키므로 제거합니다.
// dynamic = 'force-dynamic' 만으로도 실시간 페이지 렌더링을 충분히 유도할 수 있습니다.
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
    <div className="w-full">
      <header className="px-5 py-6 bg-white flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} /> AI-Stock
        </h1>
        <button onClick={() => { fetchMarket(); fetchPrices(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400">
           <RefreshCcw className={isRefreshing ? 'animate-spin' : ''} size={18} />
        </button>
      </header>

      <div className="px-5 mt-6 space-y-8">
        {/* 시장 지수 */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.map(m => (
             <div key={m.symbol} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase opacity-70">{m.name}</p>
                <div className="flex justify-between items-end">
                   <h2 className={`text-lg font-bold ${m.changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{m.price.toLocaleString()}</h2>
                   <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${m.changePercent >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {m.changePercent >= 0 ? '+' : ''}{m.changePercent.toFixed(1)}%
                   </span>
                </div>
             </div>
           ))}
        </section>

        {/* 자산 상태 요약 */}
        <section className="bg-white p-7 rounded-[1.5rem] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-1.5 text-slate-400 mb-4 opacity-70">
              <Wallet size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">My Total Assets</span>
           </div>
           <div className="flex items-baseline gap-3 mb-6">
              <h2 className="text-3xl font-bold text-slate-900 tabular-nums">{totalCurrent.toLocaleString()}원</h2>
              <p className={`text-sm font-bold ${parseFloat(totalRate) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
           </div>
           <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50">
              <div>
                 <p className="text-[9px] font-bold text-slate-300 uppercase mb-0.5 opacity-60">총 수익</p>
                 <p className={`text-base font-bold ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div>
                 <p className="text-[9px] font-bold text-slate-300 uppercase mb-0.5 opacity-60">투자 원금</p>
                 <p className="text-base font-bold text-slate-900">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI 인사이트 섹션 - 파스텔톤 적용 및 가독성 강화 */}
        <section className="space-y-4">
           <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
             <Sparkles className="text-blue-600" size={20} /> AI 투자 인사이트
           </h3>
           <div className="bg-blue-50 rounded-2xl p-6 text-gray-800 shadow-sm border border-blue-100 relative overflow-hidden min-h-[160px] flex flex-col justify-center break-words">
              {isAiLoading ? (
                <div className="text-center flex flex-col items-center gap-3">
                   <Loader2 className="animate-spin text-blue-400" size={32} />
                   <p className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Analyzing...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in duration-500">
                   <div className="px-2 py-0.5 bg-blue-100 rounded text-[9px] font-black w-fit mb-4 text-blue-600 uppercase">Strategy Report</div>
                   <p className="text-[15px] font-bold leading-relaxed text-slate-700 whitespace-pre-line italic">
                      "{aiAnalysis}"
                   </p>
                </div>
              ) : (
                <div className="text-center opacity-40 py-4">
                   <Bot size={40} className="mx-auto mb-3 text-blue-200" />
                   <p className="text-sm font-medium">분석할 종목을 선택하여 전략을 확인하세요.</p>
                </div>
              )}
           </div>
        </section>

        {/* 주식 리스트 */}
        <section className="space-y-4 pb-12">
           <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 px-1">내 주식</h3>
           </div>
           <div className="space-y-3">
              {stocks.map(s => {
                const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                const isProfit = parseFloat(profitRate) >= 0;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => { setSelectedStock(s); runAnalysis(s); }} 
                    className="w-full flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                     <div className="flex flex-col gap-0.5">
                        <h4 className="text-lg font-bold text-slate-900">{s.name}</h4>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.symbol} · {s.quantity}주</span>
                     </div>
                     <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{(s.currentPrice || s.avgPrice).toLocaleString()}</p>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
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
