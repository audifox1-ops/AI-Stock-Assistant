"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Wallet, BarChart3, Bot, Sparkles, Loader2, HelpCircle, 
  Info, ChevronRight, X, Plus, TrendingUp, Search, AlertCircle, TrendingDown,
  Target, Activity, Zap, Star, LayoutGrid, List as ListIcon, PieChart,
  Lightbulb, ShieldAlert
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
  const [selectedStock, setSelectedStock] = useState<Stock | NaverStock | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  // 네이버 랭킹 상태
  const [rankingType, setRankingType] = useState('marketValue'); // marketValue, search, volume
  const [rankingCategory, setRankingCategory] = useState('KOSPI');
  const [rankingStocks, setRankingStocks] = useState<NaverStock[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  // UX 인터랙션 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('');

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

  const handleStockClick = (stock: Stock | NaverStock) => {
    setSelectedStock(stock);
    setIsMenuOpen(true);
  };

  const runAiAnalysis = async (mode: 'basic' | 'strategy') => {
    if (!selectedStock) return;
    
    setIsMenuOpen(false);
    setIsAnalysisModalOpen(true);
    setIsAiLoading(true);
    setAiAnalysis(null);
    
    const name = 'stockName' in selectedStock ? selectedStock.stockName : selectedStock.name;
    const symbol = 'itemCode' in selectedStock ? selectedStock.itemCode : selectedStock.symbol;
    const price = 'closePrice' in selectedStock ? selectedStock.closePrice : (selectedStock.currentPrice || selectedStock.avgPrice);
    const change = 'fluctuationsRatio' in selectedStock ? selectedStock.fluctuationsRatio : (selectedStock.changePercent || 0);
    const potential = 'upsidePotential' in selectedStock ? selectedStock.upsidePotential : '-';

    setAnalysisTitle(mode === 'basic' ? 'AI 종목분석' : 'AI 투자전략');

    const instruction = mode === 'basic' 
      ? `현재가 ${price}, 상승여력 ${potential}% 데이터를 바탕으로 이 기업의 현재 상황과 펀더멘털을 3줄로 팩트 위주로 분석해.`
      : `현재가 ${price}, 목표주가 데이터를 바탕으로 지금 매수/매도/관망 중 어떤 포지션이 유리한지, 실전 투자 전략을 3줄로 과감하게 제시해.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          name,
          price,
          changePercent: change,
          instruction
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("네트워크 상태를 확인해 주세요.");
    } finally {
      setIsAiLoading(false);
    }
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
    <div className="w-full pb-24 relative min-h-screen bg-slate-50 font-sans overflow-x-hidden">
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
        {/* Market Board */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.length === 0 ? (
             [1,2].map(i => (
               <div key={i} className="bg-white h-32 rounded-2xl border border-gray-100 animate-pulse"></div>
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

        {/* Home Banner */}
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
                종목을 터치하여 팩트 기반의 분석과 과감한 투자 전략을 실시간으로 확인하세요.
             </p>
          </div>
        )}

        {/* 실시간 시장 랭킹 (TOP 30) */}
        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/30">
              <div className="space-y-1">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                    <TrendingUp size={18} className="text-red-500" /> Market Pulse 30
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400">종목을 터치하여 AI 분석을 시작하세요</p>
              </div>
              <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-200">
                 <button onClick={() => setRankingCategory('KOSPI')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSPI' ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>KOSPI</button>
                 <button onClick={() => setRankingCategory('KOSDAQ')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${rankingCategory === 'KOSDAQ' ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>KOSDAQ</button>
              </div>
           </div>
           
           <div className="flex px-6 py-5 gap-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-50">
              <button onClick={() => setRankingType('marketValue')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'marketValue' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>시총상위</button>
              <button onClick={() => setRankingType('search')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'search' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>인기검색</button>
              <button onClick={() => setRankingType('volume')} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'volume' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>거래량상위</button>
           </div>

           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-gray-100">
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">종목명</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">현재가</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">등락률</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-100 uppercase tracking-widest text-right whitespace-nowrap bg-blue-600/90 shadow-sm">상승여력</th>
                       <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">목표가</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">투자의견</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 bg-white">
                    {isRankingLoading ? (
                       <tr>
                          <td colSpan={6} className="py-28 text-center bg-white">
                             <div className="flex flex-col items-center gap-5">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Optimizing Analysis...</p>
                             </div>
                          </td>
                       </tr>
                    ) : rankingStocks.map((rs, idx) => {
                       const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                       const potentialVal = parseFloat(rs.upsidePotential);
                       const hasPotential = !isNaN(potentialVal);
                       
                       return (
                          <tr key={rs.itemCode} onClick={() => handleStockClick(rs)} className="hover:bg-blue-50/40 transition-all group cursor-pointer active:bg-blue-50/80">
                             <td className="px-6 py-6 whitespace-nowrap border-l-4 border-transparent group-hover:border-blue-500 transition-all">
                                <div className="flex items-center gap-4">
                                   <span className="text-xs font-black text-slate-900/10 group-hover:text-blue-500/20 transition-colors">{idx + 1}</span>
                                   <div>
                                      <p className="text-sm font-black text-slate-900 tracking-tight">{rs.stockName}</p>
                                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{rs.itemCode}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-6 font-black text-sm text-slate-900 text-right tabular-nums whitespace-nowrap">{rs.closePrice}</td>
                             <td className={`px-4 py-6 font-black text-xs text-right whitespace-nowrap ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                                {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                             </td>
                             <td className="px-4 py-6 text-right whitespace-nowrap bg-blue-50/20">
                                <span className={`text-[13px] font-black tabular-nums ${
                                   hasPotential && potentialVal > 30 ? 'text-red-600' : 
                                   hasPotential && potentialVal > 15 ? 'text-red-400' : 
                                   hasPotential && potentialVal > 0 ? 'text-slate-900' : 'text-slate-300'
                                }`}>
                                   {hasPotential ? `${potentialVal > 0 ? '+' : ''}${potentialVal}%` : '-'}
                                </span>
                             </td>
                             <td className="px-4 py-6 text-[11px] font-black text-slate-900 text-right whitespace-nowrap">{rs.targetPrice}</td>
                             <td className="px-6 py-6 text-center">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                   rs.opinion === '매수' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 
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

        {/* Portfolio Stats */}
        <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-full blur-[80px] -mr-24 -mt-24"></div>
           <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2 text-slate-400">
                 <Wallet size={16} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-0.5">Asset Performance</span>
              </div>
              <Info size={16} className="text-slate-200" />
           </div>
           <div className="flex items-baseline gap-4 mb-8 relative z-10 text-center mx-auto w-fit">
              <h2 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{totalCurrent.toLocaleString()}원</h2>
              <div className={`px-3 py-1 rounded-2xl text-xs font-black ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                 {parseFloat(totalRate) >= 0 ? '▲' : '▼'} {totalRate}%
              </div>
           </div>
           <div className="grid grid-cols-2 gap-6 pt-8 border-t border-slate-50 relative z-10">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Gains</p>
                 <p className={`text-xl font-black tabular-nums ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cost Basis</p>
                 <p className="text-xl font-black text-slate-900 tabular-nums">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* My Stock List */}
        <section className="space-y-6 pb-20">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">My Holdings</h3>
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-xl shadow-slate-200">
                <Plus size={16} /> New Asset
              </button>
           </div>
           
           <div className="space-y-4">
              {stocks.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 text-center flex flex-col items-center gap-5">
                   <div className="p-6 bg-slate-50 rounded-[2rem]">
                      <LayoutGrid size={32} className="text-slate-200" />
                   </div>
                   <p className="text-sm font-bold text-slate-400">관리 중인 종목이 없습니다.</p>
                </div>
              ) : (
                stocks.map(s => {
                  const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                  const isProfit = parseFloat(profitRate) >= 0;
                  const isSelected = selectedStock && ('id' in selectedStock) && selectedStock.id === s.id;
                  
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => handleStockClick(s)} 
                      className={`w-full flex justify-between items-center p-7 rounded-[2.25rem] border transition-all active:scale-[0.98] cursor-pointer
                        ${isSelected ? 'bg-blue-600 border-blue-600 shadow-2xl shadow-blue-100' : 'bg-white border-gray-100 hover:border-blue-100 shadow-sm'}
                      `}
                    >
                       <div className="flex flex-col gap-2">
                          <h4 className={`text-xl font-black tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                          <span className={`text-[11px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>{s.symbol} · {s.quantity}주</span>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2.5">
                          <p className={`text-2xl font-black tabular-nums tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                             {(s.currentPrice || s.avgPrice).toLocaleString()}
                          </p>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-xl shadow-sm ${
                            isSelected ? 'bg-white/20 text-white' : (isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500')
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

      {/* Action Menu Popover (하단 미니 메뉴) */}
      {isMenuOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-5 pb-10">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[420px] rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                       <TrendingUp size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {'stockName' in selectedStock ? selectedStock.stockName : selectedStock.name}
                       </h3>
                       <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Select AI Analysis Mode</p>
                    </div>
                 </div>
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => runAiAnalysis('basic')}
                   className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[2rem] hover:bg-blue-50 hover:text-blue-600 transition-all group active:scale-95"
                 >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-blue-100 transition-all">
                       <Bot size={24} className="text-slate-900 group-hover:text-blue-600" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">AI 종목 분석</span>
                    <p className="text-[9px] font-bold text-slate-400 group-hover:text-blue-400 text-center leading-tight">상황 및 펀더멘털<br/>핵심 팩트 체크</p>
                 </button>
                 <button 
                   onClick={() => runAiAnalysis('strategy')}
                   className="flex flex-col items-center gap-3 p-6 bg-slate-900 rounded-[2rem] hover:bg-blue-600 transition-all group active:scale-95"
                 >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                       <Lightbulb size={24} className="text-white" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">AI 투자 전략</span>
                    <p className="text-[9px] font-bold text-white/50 group-hover:text-white/80 text-center leading-tight">매수/매도 포지션<br/>과감한 전략 제시</p>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-5">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg" onClick={() => !isAiLoading && setIsAnalysisModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[440px] rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                       <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{analysisTitle}</h2>
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">
                        {'stockName' in (selectedStock || {}) ? (selectedStock as NaverStock).stockName : (selectedStock as Stock)?.name} · AI Response
                       </p>
                    </div>
                 </div>
                 {!isAiLoading && (
                   <button onClick={() => setIsAnalysisModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all">
                      <X size={24} />
                   </button>
                 )}
              </div>

              <div className="min-h-[220px] flex flex-col justify-center relative z-10">
                 {isAiLoading ? (
                    <div className="text-center space-y-6 py-10">
                       <div className="relative inline-block">
                          <Loader2 className="animate-spin text-blue-600" size={56} />
                          <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping opacity-20"></div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Deep Brain Learning...</p>
                          <p className="text-[10px] font-bold text-slate-400">데이터를 분석하여 최적의 통찰을 연산 중입니다</p>
                       </div>
                    </div>
                 ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/50">
                          <p className="text-[17px] font-bold leading-[1.8] text-gray-800 whitespace-pre-wrap tracking-tight">
                             {aiAnalysis}
                          </p>
                       </div>
                       <p className="text-[10px] font-bold text-slate-300 mt-6 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                          <ShieldAlert size={12} /> AI Insight may have limitations. invest at your own risk.
                       </p>
                    </div>
                 )}
              </div>
              
              {!isAiLoading && (
                 <button 
                   onClick={() => setIsAnalysisModalOpen(false)}
                   className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.75rem] shadow-2xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-8 uppercase tracking-widest text-xs"
                 >
                    Close Analysis
                 </button>
              )}
           </div>
        </div>
      )}

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
