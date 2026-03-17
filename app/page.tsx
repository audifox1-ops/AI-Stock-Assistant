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
  upsidePotential: string;
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
    } catch (e) {
      console.error("Market fetch error:", e);
    }
  };

  const fetchNaverRanking = async () => {
    setIsRankingLoading(true);
    try {
      const res = await fetch(`/api/naver?type=${rankingType}&category=${rankingCategory}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setRankingStocks(data);
    } catch (e) {
      console.error("Ranking fetch error:", e);
    }
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
        {/* Market Board (실시간 지수 보드) */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.length === 0 ? (
             [1,2].map(i => (
               <div key={i} className="bg-white h-28 rounded-2xl border border-gray-100 animate-pulse flex flex-col p-4">
                  <div className="w-16 h-3 bg-slate-100 rounded mb-4"></div>
                  <div className="w-24 h-6 bg-slate-50 rounded mb-2"></div>
                  <div className="w-20 h-3 bg-slate-50/50 rounded"></div>
               </div>
             ))
           ) : marketIndices.map(m => (
             <div key={m.name} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 transition-colors group-hover:bg-blue-50/30 rounded-full -mr-8 -mt-8"></div>
                <div className="flex justify-between items-start relative z-10">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{m.name}</p>
                   <Activity size={14} className={m.isUp ? 'text-red-400' : 'text-blue-400'} />
                </div>
                <div className="relative z-10">
                   <h2 className={`text-2xl font-black tabular-nums tracking-tighter ${m.isUp ? 'text-red-500' : 'text-blue-500'}`}>
                      {m.price}
                   </h2>
                   <div className="flex items-center gap-2 mt-1">
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

        {/* Main Banner */}
        {showBanner && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-blue-600/10 blur-[100px] pointer-events-none"></div>
             <button onClick={() => setShowBanner(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <X size={18} />
             </button>
             <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                   <Zap className="text-white" size={24} />
                </div>
                <div>
                   <h4 className="font-black text-lg tracking-tight">AI Premium Radar</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 2.5</p>
                </div>
             </div>
             <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
                시장 지수와 TOP 30 종목의 상승 여력을 실시간으로 조망하세요.<br/>
                빅데이터 기반의 인사이트가 당신의 수익률을 가이드합니다.
             </p>
             <button onClick={() => setIsAddModalOpen(true)} className="w-full bg-white text-slate-900 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">
                Manage My Assets <ChevronRight size={14} className="inline ml-1" />
             </button>
          </div>
        )}

        {/* 실시간 시장 랭킹 (TOP 30) */}
        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/30">
              <div className="space-y-1">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                    <TrendingUp size={18} className="text-red-500" /> Market Pulse 30
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400">실시간 데이터 파이프라인 연동 완료</p>
              </div>
              <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-200">
                 <button onClick={() => setRankingCategory('KOSPI')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSPI' ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>KOSPI</button>
                 <button onClick={() => setRankingCategory('KOSDAQ')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSDAQ' ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>KOSDAQ</button>
              </div>
           </div>
           
           <div className="flex px-6 py-5 gap-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-50">
              <button onClick={() => setRankingType('marketValue')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'marketValue' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>시총상위</button>
              <button onClick={() => setRankingType('search')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'search' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>인기검색</button>
              <button onClick={() => setRankingType('volume')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'volume' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>거래량상위</button>
           </div>

           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100">
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">종목명</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">현재가</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">등락률</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">거래량</th>
                       <th className="px-4 py-5 text-[10px] font-black text-blue-600 uppercase tracking-widest text-right whitespace-nowrap bg-blue-50/30">상승여력</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">목표가</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">투자의견</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 bg-white">
                    {isRankingLoading ? (
                       <tr>
                          <td colSpan={7} className="py-28 text-center bg-white">
                             <div className="flex flex-col items-center gap-5">
                                <div className="p-4 bg-blue-50 rounded-3xl relative">
                                   <Loader2 className="animate-spin text-blue-600" size={32} />
                                   <div className="absolute inset-0 border-2 border-blue-100 rounded-3xl animate-ping scale-150 opacity-10"></div>
                                </div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">Assembling Assets...</p>
                             </div>
                          </td>
                       </tr>
                    ) : rankingStocks.map((rs, idx) => {
                       const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                       const potentialVal = parseFloat(rs.upsidePotential);
                       const hasPotential = !isNaN(potentialVal);
                       
                       return (
                          <tr key={rs.itemCode} className="hover:bg-slate-50/80 transition-all group cursor-default">
                             <td className="px-6 py-6 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                   <div className="flex flex-col items-center justify-center">
                                      <span className="text-[9px] font-black text-slate-200 group-hover:text-blue-500 transition-colors uppercase">Rank</span>
                                      <span className="text-xs font-black text-slate-900 leading-none">{idx + 1}</span>
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{rs.stockName}</p>
                                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{rs.itemCode}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-6 font-black text-sm text-slate-900 text-right tabular-nums whitespace-nowrap">{rs.closePrice}</td>
                             <td className={`px-4 py-6 font-black text-xs text-right whitespace-nowrap ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                             </td>
                             <td className="px-4 py-6 text-[11px] font-bold text-slate-400 text-right whitespace-nowrap tabular-nums">{rs.accumulatedTradingVolume}</td>
                             <td className={`px-4 py-6 text-right whitespace-nowrap bg-blue-50/10`}>
                                <div className="flex flex-col items-end">
                                   <span className={`text-[13px] font-black tabular-nums transition-colors ${
                                      hasPotential && potentialVal > 30 ? 'text-red-600' : 
                                      hasPotential && potentialVal > 15 ? 'text-red-400' : 
                                      hasPotential && potentialVal > 0 ? 'text-slate-900' : 'text-slate-300'
                                   }`}>
                                      {hasPotential ? `${potentialVal > 0 ? '+' : ''}${potentialVal}%` : '-'}
                                   </span>
                                   {hasPotential && potentialVal > 0 && (
                                     <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-red-400" style={{ width: `${Math.min(potentialVal, 100)}%` }}></div>
                                     </div>
                                   )}
                                </div>
                             </td>
                             <td className="px-4 py-6 text-[11px] font-black text-slate-900 text-right whitespace-nowrap tabular-nums">{rs.targetPrice}</td>
                             <td className="px-6 py-6 text-center">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                   rs.opinion === '매수' ? 'bg-red-500 text-white shadow-md shadow-red-100' : 
                                   rs.opinion === '중립' ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-300'
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
        </section>

        {/* Portfolio Overview */}
        <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 opacity-5 blur-[80px] rounded-full group-hover:opacity-10 transition-opacity"></div>
           <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2 text-slate-400">
                 <div className="p-1.5 bg-slate-50 rounded-lg">
                    <Wallet size={16} />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-0.5">My Liquidity Overview</span>
              </div>
              <Info size={16} className="text-slate-200 cursor-pointer hover:text-slate-400 transition-colors" />
           </div>
           <div className="flex items-baseline gap-4 mb-8 relative z-10">
              <h2 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{totalCurrent.toLocaleString()}원</h2>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-2xl ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                 <span className="text-xs font-black">{parseFloat(totalRate) >= 0 ? '▲' : '▼'} {totalRate}%</span>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-50 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Net Return</p>
                 <p className={`text-xl font-black tabular-nums tracking-tight ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Total Investment</p>
                 <p className="text-xl font-black text-slate-900 tabular-nums tracking-tight">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI Insight Bridge */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                   <Sparkles className="text-blue-600" size={18} />
                </div>
                AI Research Lab
              </h3>
           </div>
           <div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-200 flex flex-col justify-center min-h-[220px] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
              
              {isAiLoading ? (
                <div className="text-center flex flex-col items-center gap-5 relative z-10">
                   <div className="p-5 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl">
                      <Loader2 className="animate-spin text-white" size={40} />
                   </div>
                   <p className="text-[11px] font-black text-blue-100 tracking-[0.3em] uppercase ml-2">Processing Neural Insights...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                         <div className="px-4 py-1.5 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-900/20">{selectedStock?.name} Analysis</div>
                         <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full animate-bounce delay-75"></div>
                         </div>
                      </div>
                   </div>
                   <p className="text-[17px] font-bold leading-[1.8] text-white/95 whitespace-pre-wrap tracking-tight">
                      {aiAnalysis}
                   </p>
                </div>
              ) : (
                <div className="text-center py-8 relative z-10">
                   <Bot size={64} className="mx-auto mb-6 text-white/20 group-hover:text-white/40 transition-colors" />
                   <div className="space-y-2">
                      <p className="text-lg font-bold text-white tracking-tight">AI 전략 센터가 활성화되었습니다.</p>
                      <p className="text-sm font-bold text-blue-100/60 leading-relaxed uppercase tracking-widest">
                         Select an asset from your list to begin
                      </p>
                   </div>
                </div>
              )}
           </div>
        </section>

        {/* My Stock List */}
        <section className="space-y-5 pb-16">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">My Assets</h3>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
              >
                <Plus size={16} /> New Asset
              </button>
           </div>
           
           <div className="space-y-4">
              {stocks.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 text-center flex flex-col items-center gap-5">
                   <div className="p-6 bg-slate-50 rounded-[2rem]">
                      <LayoutGrid size={32} className="text-slate-200" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-base font-black text-slate-400 uppercase tracking-widest">No Assets Detected</p>
                      <p className="text-xs font-bold text-slate-300">Start by adding your first stock investment</p>
                   </div>
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
                      className={`w-full flex justify-between items-center p-7 rounded-[2rem] border transition-all active:scale-[0.98] cursor-pointer
                        ${isSelected ? 'bg-blue-600 border-blue-600 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.3)]' : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-xl hover:shadow-slate-100 shadow-sm'}
                      `}
                    >
                       <div className="flex flex-col gap-2">
                          <h4 className={`text-xl font-black tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                          <div className={`flex items-center gap-3 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                             <span className="text-[11px] font-black uppercase tracking-[0.15em]">{s.symbol}</span>
                             <span className="w-1 h-1 bg-current rounded-full opacity-30"></span>
                             <span className="text-[11px] font-black">{s.quantity} Shares</span>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2.5">
                          <p className={`text-2xl font-black tabular-nums leading-none tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                             {(s.currentPrice || s.avgPrice).toLocaleString()}
                          </p>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-xl ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : (isProfit ? 'bg-red-50 text-red-500 shadow-sm shadow-red-50' : 'bg-blue-50 text-blue-500 shadow-sm shadow-blue-50')
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
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-10">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">Add New Asset</h2>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Connect to global markets</p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleAddStock} className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Stock Entity Name</label>
                    <input 
                      type="text" required placeholder="Apple, 삼성전자, 태웅..."
                      className="w-full border border-slate-100 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-5 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none font-bold transition-all"
                      value={newStock.nameOrSymbol} onChange={e => setNewStock({...newStock, nameOrSymbol: e.target.value})}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Avg. Cost</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full border border-slate-100 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-5 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none font-bold transition-all"
                         value={newStock.avgPrice} onChange={e => setNewStock({...newStock, avgPrice: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Quantity</label>
                       <input 
                         type="number" required placeholder="0"
                         className="w-full border border-slate-100 bg-slate-50/50 text-slate-900 placeholder-gray-400 p-5 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:outline-none font-bold transition-all"
                         value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})}
                       />
                    </div>
                 </div>
                 
                 <div className="pt-2 flex items-center gap-3">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                       <AlertCircle size={14} className="text-blue-500" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 leading-snug">실시간 시세 연동을 위해 종목명이 정확해야 합니다.</p>
                 </div>

                 <button 
                   disabled={isSubmitting}
                   className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-6 uppercase tracking-widest text-xs"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Activation'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
