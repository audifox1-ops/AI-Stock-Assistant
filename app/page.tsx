"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Wallet, BarChart3, Bot, Sparkles, Loader2, HelpCircle, 
  Info, ChevronRight, X, Plus, TrendingUp, Search, AlertCircle, TrendingDown,
  Target, Activity, Zap, Star, LayoutGrid, List as ListIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// 종목명 기반 티커 자동 매핑 딕셔너리
const stockTickerMap: Record<string, string> = { 
  "태웅": "044490.KQ", 
  "삼성전자": "005930.KS", 
  "SK하이닉스": "000660.KS", 
  "카카오": "035720.KS",
  "네이버": "035420.KS",
  "현대차": "005380.KS",
  "LG에너지솔루션": "373220.KS",
  "삼성바이오로직스": "207940.KS"
};

interface NaverStock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  accumulatedTradingVolume: string;
  high52: string;
  low52: string;
  targetPrice: string | number;
  opinion: string;
}

interface IndexData {
  name: string;
  price: string;
  changePrice: string;
  changeRate: string;
  isUp: boolean;
}

interface Stock {
  id: string | number;
  symbol: string;
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  changePercent?: number;
}

export default function PortfolioPage() {
  // --- 상태 관리 ---
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<IndexData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  // 네이버 랭킹 상태
  const [rankingType, setRankingType] = useState('marketValue'); // marketValue, search, volume
  const [rankingCategory, setRankingCategory] = useState('KOSPI');
  const [rankingStocks, setRankingStocks] = useState<NaverStock[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  // 모달 및 폼 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ nameOrSymbol: '', avgPrice: '', quantity: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 데이터 패칭 ---
  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (e) {}
  };

  const fetchNaverRanking = async () => {
    setIsRankingLoading(true);
    try {
      const res = await fetch(`/api/naver?type=${rankingType}&category=${rankingCategory}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setRankingStocks(data);
    } catch (e) {}
    finally { setIsRankingLoading(false); }
  };

  const fetchHoldings = async () => {
    try {
      const { data } = await supabase.from('portfolio_stocks').select('*').order('created_at', { ascending: false });
      if (data) {
        setStocks(data.map(item => ({
          id: item.id, 
          symbol: item.stock_code, 
          name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), 
          currentPrice: item.last_price ? Number(item.last_price) : null, 
          quantity: Number(item.quantity)
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async () => {
    const symbols = stocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) {
      setIsRefreshing(false);
      return;
    }
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
    setSelectedStock(stock);
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

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.nameOrSymbol || !newStock.avgPrice || !newStock.quantity) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('portfolio_stocks').insert([{
        stock_code: (stockTickerMap[newStock.nameOrSymbol.trim()] || newStock.nameOrSymbol).toUpperCase(),
        stock_name: newStock.nameOrSymbol.trim(),
        avg_buy_price: parseFloat(newStock.avgPrice),
        quantity: parseFloat(newStock.quantity)
      }]);

      if (error) throw error;
      
      await fetchHoldings();
      setIsAddModalOpen(false);
      setNewStock({ nameOrSymbol: '', avgPrice: '', quantity: '' });
    } catch (e: any) {
      alert("추가 중 오류 발생: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMarket();
    fetchHoldings();
    fetchNaverRanking();
    const interval = setInterval(() => {
      fetchMarket();
      fetchPrices();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNaverRanking();
  }, [rankingType, rankingCategory]);

  useEffect(() => { if(stocks.length > 0) fetchPrices(); }, [stocks.length]);

  const totalCurrent = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuy = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalRate = totalBuy > 0 ? ((totalCurrent / totalBuy - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="w-full pb-24 relative min-h-screen bg-slate-50 font-sans">
      <header className="px-5 py-6 bg-white flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} /> AI-Stock
        </h1>
        <div className="flex items-center gap-2">
           <Link href="/watchlist" className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <Star size={18} />
           </Link>
           <button onClick={() => { fetchMarket(); fetchPrices(); fetchNaverRanking(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <RefreshCcw className={isRefreshing ? 'animate-spin text-blue-500' : ''} size={18} />
           </button>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-6">
        {/* Market Board (지수 카드) */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.length === 0 ? (
             [1,2].map(i => (
               <div key={i} className="bg-white h-24 rounded-2xl border border-gray-100 animate-pulse"></div>
             ))
           ) : marketIndices.map(m => (
             <div key={m.name} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
                <div className="flex justify-between items-start">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{m.name} Index</p>
                   <Activity size={12} className={m.isUp ? 'text-red-400' : 'text-blue-400'} />
                </div>
                <div>
                   <h2 className={`text-2xl font-bold tabular-nums tracking-tighter ${m.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                      {m.price}
                   </h2>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-black ${m.isUp ? 'text-red-400' : 'text-blue-400'}`}>
                         {m.isUp ? '▲' : '▼'} {m.changePrice}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${m.isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                         {m.changeRate}%
                      </span>
                   </div>
                </div>
             </div>
           ))}
        </section>

        {/* Home Banner */}
        {showBanner && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
             <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 opacity-60 hover:opacity-100">
                <X size={18} />
             </button>
             <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                   <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-base">실시간 시장 인사이트</h4>
             </div>
             <p className="text-sm text-blue-50 font-medium leading-snug mb-4">
                네이버증권 TOP 30 종목의 상세 분석 리포트를 즉시 받아보세요.
             </p>
             <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-1.5 bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-50 transition-colors">
                종목 추가 및 관리 <ChevronRight size={14} />
             </button>
          </div>
        )}

        {/* 실시간 시장 랭킹 (TOP 30) */}
        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <TrendingUp size={16} className="text-red-500" /> Real-time Rankings
              </h3>
              <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
                 <button onClick={() => setRankingCategory('KOSPI')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${rankingCategory === 'KOSPI' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}>KOSPI</button>
                 <button onClick={() => setRankingCategory('KOSDAQ')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${rankingCategory === 'KOSDAQ' ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-400'}`}>KOSDAQ</button>
              </div>
           </div>
           
           <div className="flex px-5 py-4 gap-2 overflow-x-auto no-scrollbar bg-white border-b border-gray-50">
              <button onClick={() => setRankingType('marketValue')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'marketValue' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>시총상위</button>
              <button onClick={() => setRankingType('search')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'search' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>인기검색</button>
              <button onClick={() => setRankingType('volume')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'volume' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>거래량상위</button>
           </div>

           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100">
                       <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">종목명</th>
                       <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">현재가</th>
                       <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">등락률</th>
                       <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">거래량</th>
                       <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">52주 고/저</th>
                       <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">목표가</th>
                       <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">의견</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 bg-white">
                    {isRankingLoading ? (
                       <tr>
                          <td colSpan={7} className="py-24 text-center">
                             <div className="flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin text-blue-500" size={32} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Synchronizing Data...</p>
                             </div>
                          </td>
                       </tr>
                    ) : rankingStocks.map((rs, idx) => {
                       const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                       return (
                          <tr key={rs.itemCode} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                             <td className="px-5 py-5 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-black text-blue-600/30 w-4">{idx + 1}</span>
                                   <div>
                                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{rs.stockName}</p>
                                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">{rs.itemCode}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-5 font-black text-sm text-slate-900 text-right tabular-nums whitespace-nowrap">{rs.closePrice}</td>
                             <td className={`px-4 py-5 font-black text-xs text-right whitespace-nowrap ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                             </td>
                             <td className="px-4 py-5 text-[11px] font-bold text-slate-400 text-right whitespace-nowrap">{rs.accumulatedTradingVolume}</td>
                             <td className="px-4 py-5 text-right whitespace-nowrap">
                                <div className="flex flex-col items-end gap-0.5">
                                   <p className="text-[10px] font-bold text-red-400 leading-none">{rs.high52}</p>
                                   <p className="text-[10px] font-bold text-blue-400 leading-none">{rs.low52}</p>
                                </div>
                             </td>
                             <td className="px-4 py-5 text-[11px] font-black text-slate-900 text-right whitespace-nowrap">{rs.targetPrice}</td>
                             <td className="px-5 py-5 text-center">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                   rs.opinion === '매수' ? 'bg-red-50 text-red-500' : 
                                   rs.opinion === '중립' ? 'bg-gray-100 text-gray-500' : 'bg-slate-50 text-slate-400'
                                }`}>
                                   {rs.opinion}
                                </span>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
           
           {!isRankingLoading && rankingStocks.length === 0 && (
             <div className="py-20 text-center bg-white flex flex-col items-center gap-3">
                <AlertCircle className="text-slate-200" size={40} />
                <p className="text-sm font-bold text-slate-300 tracking-tight">현재 데이터를 불러올 수 없습니다.<br/>새로고침을 눌러주세요.</p>
             </div>
           )}
        </section>

        {/* Portfolio Stats */}
        <section className="bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
           <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-1.5 text-slate-400 opacity-80">
                 <Wallet size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">My Assets Overview</span>
              </div>
              <Info size={14} className="text-slate-200 cursor-pointer" />
           </div>
           <div className="flex items-baseline gap-3 mb-6 relative z-10">
              <h2 className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{totalCurrent.toLocaleString()}원</h2>
              <p className={`text-sm font-bold px-2 py-0.5 rounded-lg ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
           </div>
           <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 relative z-10">
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5 opacity-70">실시간 손익</p>
                 <p className={`text-base font-bold ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5 opacity-70">투자 원금</p>
                 <p className="text-base font-bold text-slate-900">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI Insight */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={20} /> AI 투자 리서치
              </h3>
           </div>
           <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 flex flex-col justify-center min-h-[200px] relative overflow-hidden decoration-none group transition-all">
              {/* Background Glow */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
              
              {isAiLoading ? (
                <div className="text-center flex flex-col items-center gap-4 relative z-10">
                   <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <Loader2 className="animate-spin text-white" size={32} />
                   </div>
                   <p className="text-[11px] font-black text-blue-100 tracking-[0.25em] uppercase">Deep Neural Learning...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                   <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-2">
                         <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{selectedStock?.name}</div>
                         <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                   </div>
                   <p className="text-[16px] font-bold leading-[1.7] text-white/95 whitespace-pre-wrap">
                      {aiAnalysis}
                   </p>
                </div>
              ) : (
                <div className="text-center py-6 relative z-10">
                   <Bot size={56} className="mx-auto mb-5 text-blue-200/40" />
                   <p className="text-sm font-bold text-blue-100/80 leading-relaxed">
                      내 주식 리스트를 터치하면<br/>
                      <span className="text-white">Gemini 2.5 Flash</span>가 실시간 분석을 시작합니다.
                   </p>
                </div>
              )}
           </div>
        </section>

        {/* My Stock List */}
        <section className="space-y-4 pb-12">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-slate-900">내 주식</h3>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
              >
                <Plus size={14} /> 종목 추가
              </button>
           </div>
           
           <div className="space-y-3">
              {stocks.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-[2rem] p-12 text-center flex flex-col items-center gap-4">
                   <div className="p-4 bg-slate-50 rounded-full">
                      <LayoutGrid size={28} className="text-slate-300" />
                   </div>
                   <p className="text-sm font-bold text-slate-400 leading-relaxed">
                      관리 중인 자산이 없습니다.<br/>새 종목을 추가하여 실황을 확인하세요.
                   </p>
                </div>
              ) : (
                stocks.map(s => {
                  const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                  const isProfit = parseFloat(profitRate) >= 0;
                  const isSelected = selectedStock?.id === s.id;
                  
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => runAnalysis(s)} 
                      className={`w-full flex justify-between items-center p-6 rounded-[1.75rem] border transition-all active:scale-[0.98] cursor-pointer
                        ${isSelected ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-100' : 'bg-white border-gray-100 hover:bg-slate-50 shadow-sm'}
                      `}
                    >
                       <div className="flex flex-col gap-1">
                          <h4 className={`text-lg font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                          <div className={`flex items-center gap-2 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                             <span className="text-[10px] font-black uppercase tracking-wider">{s.symbol}</span>
                             <span className="w-1 h-1 bg-current rounded-full opacity-30"></span>
                             <span className="text-[10px] font-bold">{s.quantity}주</span>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2">
                          <p className={`text-xl font-black tabular-nums leading-none tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                             {(s.currentPrice || s.avgPrice).toLocaleString()}
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : (isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500')
                          }`}>
                             {isProfit ? '▲' : '▼'} {profitRate}%
                          </span>
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </section>
      </div>

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[380px] rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Asset</h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddStock} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
                    <input 
                      type="text" required placeholder="예: 삼성전자, 태웅"
                      className="w-full border border-gray-200 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold transition-all border-transparent focus:bg-white"
                      value={newStock.nameOrSymbol} onChange={e => setNewStock({...newStock, nameOrSymbol: e.target.value})}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Avg. Price</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full border border-gray-200 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold transition-all border-transparent focus:bg-white"
                         value={newStock.avgPrice} onChange={e => setNewStock({...newStock, avgPrice: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full border border-gray-200 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-4 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold transition-all border-transparent focus:bg-white"
                         value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})}
                       />
                    </div>
                 </div>
                 
                 <div className="pt-2 flex items-center gap-2">
                    <div className="p-1 bg-blue-50 rounded-md">
                       <AlertCircle size={12} className="text-blue-500" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400">네트워크 보안을 위해 코드가 자동 매핑됩니다.</p>
                 </div>

                 <button 
                   disabled={isSubmitting}
                   className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Asset Save Now'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
